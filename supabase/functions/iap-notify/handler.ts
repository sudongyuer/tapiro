import type { IapConfig } from '../_shared/iap/config.ts';
import {
  peekNotificationEnvironment,
  VerifyError,
  type NotificationVerifier,
  type TransactionVerifier,
  type VerifiedTransaction,
} from '../_shared/iap/jws.ts';
import type { IapStore } from '../_shared/iap/store.ts';

export type IapNotifyDeps = {
  verifyNotification: NotificationVerifier;
  verifyTransaction: TransactionVerifier;
  store: IapStore;
  config: IapConfig;
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const failure = (status: number, error: string) => json(status, { error });

async function readSignedPayload(req: Request): Promise<string | null> {
  try {
    const body = (await req.json()) as { signedPayload?: unknown } | null;
    return typeof body?.signedPayload === 'string' ? body.signedPayload : null;
  } catch {
    return null;
  }
}

function verificationFailure(error: unknown) {
  return error instanceof VerifyError && error.retryable
    ? failure(503, 'verification_unavailable')
    : failure(422, 'unverified');
}

export async function handleIapNotify(req: Request, deps: IapNotifyDeps): Promise<Response> {
  if (req.method !== 'POST') return failure(405, 'method_not_allowed');
  const payload = await readSignedPayload(req);
  const environment = peekNotificationEnvironment(payload);
  if (!payload || !environment) return failure(400, 'invalid_notification');
  if (!deps.config.accepted.has(environment)) return failure(403, 'environment_not_accepted');

  let notification;
  let transaction: VerifiedTransaction | null = null;
  try {
    notification = await deps.verifyNotification(payload, environment);
    if (notification.signedTransactionInfo) {
      transaction = await deps.verifyTransaction(notification.signedTransactionInfo, environment);
    }
  } catch (error) {
    return verificationFailure(error);
  }
  if (
    notification.environment !== environment ||
    (transaction &&
      (transaction.environment !== environment || transaction.bundleId !== deps.config.bundleId))
  ) {
    return failure(422, 'unverified');
  }

  try {
    return json(200, await deps.store.applyNotification(notification, transaction));
  } catch {
    return failure(500, 'store_failed');
  }
}

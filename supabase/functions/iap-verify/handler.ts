import type { IapConfig } from '../_shared/iap/config.ts';
import {
  peekTransactionEnvironment,
  VerifyError,
  type TransactionVerifier,
} from '../_shared/iap/jws.ts';
import { StoreError, type IapStore } from '../_shared/iap/store.ts';

export type IapVerifyDeps = {
  userIdFromToken(token: string): Promise<string | null>;
  verifyTransaction: TransactionVerifier;
  store: IapStore;
  config: IapConfig;
};

const STORE_FAILURES = {
  unknown_product: 422,
  transaction_owned_elsewhere: 403,
  user_not_found: 403,
  store_failed: 500,
} as const;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const failure = (status: number, error: string) => json(status, { error });

async function readSignedTransaction(req: Request): Promise<string | null> {
  try {
    const body = (await req.json()) as { signedTransaction?: unknown } | null;
    return typeof body?.signedTransaction === 'string' ? body.signedTransaction : null;
  } catch {
    return null;
  }
}

export async function handleIapVerify(req: Request, deps: IapVerifyDeps): Promise<Response> {
  if (req.method !== 'POST') return failure(405, 'method_not_allowed');
  const header = req.headers.get('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  const userId = token ? await deps.userIdFromToken(token) : null;
  if (!userId) return failure(401, 'unauthorized');

  const jws = await readSignedTransaction(req);
  const environment = peekTransactionEnvironment(jws);
  if (!jws || !environment) return failure(400, 'invalid_transaction');
  if (!deps.config.accepted.has(environment)) return failure(403, 'environment_not_accepted');

  let transaction;
  try {
    transaction = await deps.verifyTransaction(jws, environment);
  } catch (error) {
    if (error instanceof VerifyError && error.retryable)
      return failure(503, 'verification_unavailable');
    return failure(422, 'unverified');
  }
  if (transaction.environment !== environment || transaction.bundleId !== deps.config.bundleId) {
    return failure(422, 'unverified');
  }
  if (transaction.type !== 'Consumable') return failure(422, 'not_consumable');
  if (transaction.quantity !== 1) return failure(422, 'unsupported_quantity');
  if (transaction.appAccountToken?.toLowerCase() !== userId.toLowerCase()) {
    return failure(403, 'wrong_account');
  }

  try {
    const answer =
      transaction.revocationDate === null
        ? await deps.store.credit(userId, transaction)
        : await deps.store.revoke(userId, transaction);
    return json(200, answer);
  } catch (error) {
    const code = error instanceof StoreError ? error.code : 'store_failed';
    return failure(STORE_FAILURES[code], code);
  }
}

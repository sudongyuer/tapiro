import { isIapEnvironment, type IapEnvironment } from './config.ts';

export const MAX_JWS_LENGTH = 32_768;

export type VerifiedTransaction = {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  bundleId: string;
  environment: IapEnvironment;
  type: string;
  quantity: number;
  purchaseDate: number;
  revocationDate: number | null;
  appAccountToken: string | null;
};

export type VerifiedNotification = {
  notificationUUID: string;
  notificationType: string;
  subtype: string | null;
  signedDate: number;
  environment: IapEnvironment;
  signedTransactionInfo: string | null;
};

export class VerifyError extends Error {
  constructor(
    readonly retryable: boolean,
    reason: string,
  ) {
    super(reason);
  }
}

export type TransactionVerifier = (
  jws: string,
  environment: IapEnvironment,
) => Promise<VerifiedTransaction>;

export type NotificationVerifier = (
  jws: string,
  environment: IapEnvironment,
) => Promise<VerifiedNotification>;

export function base64Der(value: string) {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}

function decodePart(part: string): unknown {
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

export function decodeJwsPayload(jws: unknown): Record<string, unknown> | null {
  if (typeof jws !== 'string' || jws.length > MAX_JWS_LENGTH) return null;
  const parts = jws.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = decodePart(parts[1]);
    return payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function peekTransactionEnvironment(jws: unknown): IapEnvironment | null {
  const environment = decodeJwsPayload(jws)?.environment;
  return isIapEnvironment(environment) ? environment : null;
}

export function peekNotificationEnvironment(jws: unknown): IapEnvironment | null {
  const data = decodeJwsPayload(jws)?.data;
  const environment =
    data && typeof data === 'object' ? (data as Record<string, unknown>).environment : null;
  return isIapEnvironment(environment) ? environment : null;
}

const text = (value: unknown) => (typeof value === 'string' && value !== '' ? value : null);
const time = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

// Xcode's StoreKit test environment numbers transactions from 0 again whenever its history is cleared or the
// Simulator is new, so on the long-lived local database a new purchase would collide with an old row and answer
// `duplicate`. The purchase date is the same in the purchase and its refund, so it keeps the id stable per purchase.
function localId(environment: IapEnvironment, id: string, purchasedAt: number) {
  return environment === 'Xcode' ? `xcode-${purchasedAt}-${id}` : id;
}

export function toVerifiedTransaction(decoded: Record<string, unknown>): VerifiedTransaction {
  const transactionId = text(decoded.transactionId);
  const productId = text(decoded.productId);
  const bundleId = text(decoded.bundleId);
  const purchaseDate = time(decoded.purchaseDate);
  const environment = decoded.environment;
  if (
    !transactionId ||
    !productId ||
    !bundleId ||
    purchaseDate === null ||
    !isIapEnvironment(environment)
  ) {
    throw new VerifyError(false, 'incomplete_transaction');
  }
  const originalTransactionId = text(decoded.originalTransactionId) ?? transactionId;
  return {
    transactionId: localId(environment, transactionId, purchaseDate),
    originalTransactionId: localId(
      environment,
      originalTransactionId,
      time(decoded.originalPurchaseDate) ?? purchaseDate,
    ),
    productId,
    bundleId,
    environment,
    type: text(decoded.type) ?? '',
    quantity: time(decoded.quantity) ?? 1,
    purchaseDate,
    revocationDate: time(decoded.revocationDate),
    appAccountToken: text(decoded.appAccountToken),
  };
}

export function toVerifiedNotification(decoded: Record<string, unknown>): VerifiedNotification {
  const data = (decoded.data ?? {}) as Record<string, unknown>;
  const notificationUUID = text(decoded.notificationUUID);
  const notificationType = text(decoded.notificationType);
  const signedDate = time(decoded.signedDate);
  const environment = data.environment;
  if (
    !notificationUUID ||
    !notificationType ||
    signedDate === null ||
    !isIapEnvironment(environment)
  ) {
    throw new VerifyError(false, 'incomplete_notification');
  }
  return {
    notificationUUID,
    notificationType,
    subtype: text(decoded.subtype),
    signedDate,
    environment,
    signedTransactionInfo: text(data.signedTransactionInfo),
  };
}

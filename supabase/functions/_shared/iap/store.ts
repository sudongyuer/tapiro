import type { IapEnvironment } from './config.ts';
import type { VerifiedNotification, VerifiedTransaction } from './jws.ts';

export type PurchaseStatus = 'credited' | 'duplicate' | 'revoked';

export type PurchaseAnswer = {
  status: PurchaseStatus;
  transactionId: string;
  productId: string;
  coins: number;
  environment: IapEnvironment;
  balance: number | null;
};

export type StoreErrorCode =
  'unknown_product' | 'transaction_owned_elsewhere' | 'user_not_found' | 'store_failed';

export class StoreError extends Error {
  constructor(readonly code: StoreErrorCode) {
    super(code);
  }
}

export type IapStore = {
  credit(buyer: string, transaction: VerifiedTransaction): Promise<PurchaseAnswer>;
  revoke(buyer: string | null, transaction: VerifiedTransaction): Promise<PurchaseAnswer>;
  applyNotification(
    notification: VerifiedNotification,
    transaction: VerifiedTransaction | null,
  ): Promise<{ status: string }>;
};

type RpcClient = {
  rpc(
    name: string,
    args: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

const KNOWN: readonly StoreErrorCode[] = [
  'unknown_product',
  'transaction_owned_elsewhere',
  'user_not_found',
];

const iso = (ms: number | null) => (ms === null ? null : new Date(ms).toISOString());

function transactionArgs(transaction: VerifiedTransaction) {
  return {
    transaction: transaction.transactionId,
    original_transaction: transaction.originalTransactionId,
    product: transaction.productId,
    env: transaction.environment,
    purchased_at: iso(transaction.purchaseDate),
  };
}

export function rpcIapStore(client: RpcClient): IapStore {
  async function call(name: string, args: Record<string, unknown>) {
    const { data, error } = await client.rpc(name, args);
    if (error) {
      const code = KNOWN.find((known) => error.message === known);
      throw new StoreError(code ?? 'store_failed');
    }
    return data;
  }
  return {
    async credit(buyer, transaction) {
      return (await call('iap_credit', {
        buyer,
        ...transactionArgs(transaction),
      })) as PurchaseAnswer;
    },
    async revoke(buyer, transaction) {
      return (await call('iap_revoke', {
        buyer,
        ...transactionArgs(transaction),
        revoked: iso(transaction.revocationDate),
      })) as PurchaseAnswer;
    },
    async applyNotification(notification, transaction) {
      return (await call('iap_apply_notification', {
        notification: notification.notificationUUID,
        kind: notification.notificationType,
        sub: notification.subtype,
        env: notification.environment,
        signed_at: iso(notification.signedDate),
        ...(transaction
          ? { ...transactionArgs(transaction), revoked: iso(transaction.revocationDate) }
          : {}),
      })) as { status: string };
    },
  };
}

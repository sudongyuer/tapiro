import { iapConfig, type IapEnvironment } from './config.ts';
import type { VerifiedNotification, VerifiedTransaction } from './jws.ts';
import { StoreError, type IapStore, type PurchaseAnswer, type StoreErrorCode } from './store.ts';

export const USER = '0b6f6c1e-7f43-4a5e-9a51-6a4a0a4f0c11';

export const HOSTED_CONFIG = iapConfig(
  (key) => ({ SUPABASE_URL: 'https://abcdefghijklmnop.supabase.co', IAP_ALLOW_XCODE: '1' })[key],
);
export const LOCAL_CONFIG = iapConfig(
  (key) => ({ SUPABASE_URL: 'http://kong:8000', IAP_ALLOW_XCODE: '1' })[key],
);

export function unsignedJws(payload: unknown) {
  const part = (value: unknown) =>
    btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${part({ alg: 'ES256', kid: 'Apple_Xcode_Key' })}.${part(payload)}.c2ln`;
}

export function transaction(overrides: Partial<VerifiedTransaction> = {}): VerifiedTransaction {
  return {
    transactionId: '2000000123456789',
    originalTransactionId: '2000000123456789',
    productId: 'app.tapiro.coins.5',
    bundleId: 'app.tapiro',
    environment: 'Sandbox',
    type: 'Consumable',
    quantity: 1,
    purchaseDate: Date.UTC(2026, 10, 11, 2),
    revocationDate: null,
    appAccountToken: USER,
    ...overrides,
  };
}

export function notification(overrides: Partial<VerifiedNotification> = {}): VerifiedNotification {
  return {
    notificationUUID: '6e1e3a8e-1c55-4a1e-8d2a-0a4f5b8c9d01',
    notificationType: 'REFUND',
    subtype: null,
    signedDate: Date.UTC(2026, 10, 12, 2),
    environment: 'Sandbox',
    signedTransactionInfo: 'signed-transaction',
    ...overrides,
  };
}

export type StoreCall =
  | { op: 'credit' | 'revoke'; buyer: string | null; transaction: VerifiedTransaction }
  | {
      op: 'notification';
      notification: VerifiedNotification;
      transaction: VerifiedTransaction | null;
    };

export function recordingStore(fail: StoreErrorCode | null = null) {
  const calls: StoreCall[] = [];
  const answer = (status: PurchaseAnswer['status'], t: VerifiedTransaction): PurchaseAnswer => ({
    status,
    transactionId: t.transactionId,
    productId: t.productId,
    coins: 5,
    environment: t.environment as IapEnvironment,
    balance: 10,
  });
  const store: IapStore = {
    async credit(buyer, t) {
      calls.push({ op: 'credit', buyer, transaction: t });
      if (fail) throw new StoreError(fail);
      return answer('credited', t);
    },
    async revoke(buyer, t) {
      calls.push({ op: 'revoke', buyer, transaction: t });
      if (fail) throw new StoreError(fail);
      return answer('revoked', t);
    },
    async applyNotification(n, t) {
      calls.push({ op: 'notification', notification: n, transaction: t });
      if (fail) throw new StoreError(fail);
      return { status: 'revoked' };
    },
  };
  return { store, calls };
}

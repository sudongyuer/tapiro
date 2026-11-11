import type { StoreProduct } from 'tapiro-kit';

import type { VerifyAnswer } from './forward';
import type { ServerPack, StoreBoundary, StoreTransaction } from './types';

export const STORE_MODES = [
  'ok',
  'pending',
  'approved',
  'cancelled',
  'failed',
  'notAllowed',
  'processing',
  'refunded',
  'noProducts',
  'productsFailed',
] as const;
export type StoreMode = (typeof STORE_MODES)[number];

export const storeMode = (value: string | undefined): StoreMode =>
  STORE_MODES.find((mode) => mode === value) ?? 'ok';

export const FIXTURE_PACKS: ServerPack[] = [
  { productId: 'app.tapiro.coins.5', coins: 5 },
  { productId: 'app.tapiro.coins.11', coins: 11 },
  { productId: 'app.tapiro.coins.35', coins: 35 },
];

const PRICES: Record<string, string> = {
  'app.tapiro.coins.5': 'RM 4.90',
  'app.tapiro.coins.11': 'RM 9.90',
  'app.tapiro.coins.35': 'RM 29.90',
};

export function createFixtureStore({
  mode,
  userId,
  delayMs = 0,
  approveAfterMs = 1500,
  onCall,
}: {
  mode: StoreMode;
  userId: () => string;
  delayMs?: number;
  approveAfterMs?: number;
  onCall?: (name: string, args: unknown) => void;
}): StoreBoundary {
  const listeners = new Set<(transaction: StoreTransaction) => void>();
  const unfinished = new Map<string, StoreTransaction>();
  let next = 1;
  let productFailures = mode === 'productsFailed' ? 1 : 0;
  const wait = () =>
    delayMs > 0 ? new Promise((resolve) => setTimeout(resolve, delayMs)) : Promise.resolve();

  const transaction = (productId: string, source: StoreTransaction['source']) => {
    const id = `fixture-${next++}`;
    const made: StoreTransaction = {
      source,
      transactionId: id,
      originalTransactionId: id,
      productId,
      jws: `fixture.${productId}.${id}`,
      environment: 'Xcode',
      appAccountToken: userId(),
      revoked: false,
      verified: true,
    };
    unfinished.set(id, made);
    return made;
  };

  return {
    async products(ids) {
      onCall?.('products', { ids });
      await wait();
      if (productFailures > 0) {
        productFailures -= 1;
        return { status: 'failed', code: 'network' };
      }
      if (mode === 'noProducts') return { status: 'ok', products: [] };
      const products: StoreProduct[] = ids.flatMap((id) =>
        PRICES[id]
          ? [
              {
                id,
                displayName: id,
                displayPrice: PRICES[id],
                price: Number(PRICES[id].replace(/[^\d.]/g, '')),
                currencyCode: 'MYR',
              },
            ]
          : [],
      );
      return { status: 'ok', products };
    },
    async purchase(productId) {
      onCall?.('purchase', { productId });
      await wait();
      if (mode === 'cancelled') return { status: 'cancelled' };
      if (mode === 'notAllowed') return { status: 'notAllowed' };
      if (mode === 'failed') return { status: 'failed', code: 'network' };
      if (mode === 'pending' || mode === 'approved') {
        if (mode === 'approved') {
          setTimeout(() => {
            const made = transaction(productId, 'updates');
            for (const listener of listeners) listener(made);
          }, approveAfterMs);
        }
        return { status: 'pending' };
      }
      return { status: 'purchased', transaction: transaction(productId, 'purchase') };
    },
    async unfinished() {
      return [...unfinished.values()];
    },
    async revoked() {
      return [];
    },
    async finish(transactionId) {
      onCall?.('finish', { transactionId });
      return unfinished.delete(transactionId);
    },
    listen(cb) {
      listeners.add(cb);
      return { remove: () => listeners.delete(cb) };
    },
  };
}

export function createFixtureVerify({
  mode,
  credit,
  delayMs = 0,
  onCall,
}: {
  mode: StoreMode;
  credit: (productId: string, coins: number) => number;
  delayMs?: number;
  onCall?: (name: string, args: unknown) => void;
}) {
  const seen = new Map<string, VerifyAnswer>();
  let rejections = mode === 'processing' ? 1 : 0;
  return async function verify(signedTransaction: string): Promise<VerifyAnswer> {
    onCall?.('verify', { signedTransaction });
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    const known = seen.get(signedTransaction);
    if (known) return known.ok ? { ...known, status: 'duplicate' } : known;
    if (rejections > 0) {
      rejections -= 1;
      return { ok: false, httpStatus: 503, error: 'verification_unavailable' };
    }
    const pack = FIXTURE_PACKS.find((candidate) =>
      signedTransaction.includes(`.${candidate.productId}.`),
    );
    if (!pack) return { ok: false, httpStatus: 422, error: 'unknown_product' };
    const answer: VerifyAnswer =
      mode === 'refunded'
        ? { ok: true, status: 'revoked', balance: null, coins: pack.coins }
        : {
            ok: true,
            status: 'credited',
            balance: credit(pack.productId, pack.coins),
            coins: pack.coins,
          };
    seen.set(signedTransaction, answer);
    return answer;
  };
}

import type { StoreProduct } from 'tapiro-kit';

import type { Pack, ServerPack } from './types';

export function toServerPacks(value: unknown): ServerPack[] {
  if (!Array.isArray(value)) throw new Error('iap_packs: unexpected answer');
  return value.map((row) => {
    const { productId, coins } = (row ?? {}) as Record<string, unknown>;
    if (typeof productId !== 'string' || productId === '' || !Number.isInteger(coins)) {
      throw new Error('iap_packs: unexpected pack');
    }
    if (Number(coins) < 1) throw new Error('iap_packs: unexpected pack');
    return { productId, coins: Number(coins) };
  });
}

export function mergePacks(
  server: readonly ServerPack[],
  products: readonly StoreProduct[],
): Pack[] {
  const prices = new Map(products.map((product) => [product.id, product.displayPrice]));
  return server.flatMap((pack) => {
    const price = prices.get(pack.productId);
    return price ? [{ ...pack, price }] : [];
  });
}

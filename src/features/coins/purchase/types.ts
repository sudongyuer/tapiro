import type { StoreProductsResult, StorePurchaseResult, StoreTransaction } from 'tapiro-kit';

import type { VerifyAnswer } from './forward';

export type StoreBoundary = {
  products(ids: string[]): Promise<StoreProductsResult>;
  purchase(productId: string, accountToken: string): Promise<StorePurchaseResult>;
  unfinished(): Promise<StoreTransaction[]>;
  revoked(): Promise<StoreTransaction[]>;
  finish(transactionId: string): Promise<boolean>;
  listen(cb: (transaction: StoreTransaction) => void): { remove(): void };
};

export type ServerPack = { productId: string; coins: number };

export type Pack = ServerPack & { price: string };

export type PurchaseDeps = {
  store: StoreBoundary;
  packs: () => Promise<ServerPack[]>;
  verify: (signedTransaction: string) => Promise<VerifyAnswer>;
  onCoinsChanged: () => void;
};

export type PurchasePhase =
  | { phase: 'idle' }
  | { phase: 'buying'; productId: string }
  | { phase: 'verifying'; productId: string }
  | { phase: 'pending'; productId: string }
  | { phase: 'processing'; productId: string }
  | { phase: 'succeeded'; productId: string; coins: number }
  | { phase: 'refunded'; productId: string }
  | { phase: 'failed'; productId: string; reason: 'failed' | 'notAllowed' };

export type { StoreTransaction };

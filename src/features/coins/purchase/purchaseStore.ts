import { IDLE_LOAD, loadFailed, loaded, loading, type Loadable } from '@/lib/loadable';
import { createStore } from '@/lib/store';

import { forwardTransaction, type ForwardOutcome } from './forward';
import { mergePacks } from './packs';
import type { Pack, PurchaseDeps, PurchasePhase, StoreTransaction } from './types';

export type PurchaseState = {
  userId: string | null;
  packs: Loadable<Pack[]>;
  purchase: PurchasePhase;
  kept: string[];
  rechecking: boolean;
  credits: number;
};

const IDLE: PurchaseState = {
  userId: null,
  packs: IDLE_LOAD,
  purchase: { phase: 'idle' },
  kept: [],
  rechecking: false,
  credits: 0,
};

const BUSY = new Set<PurchasePhase['phase']>(['buying', 'verifying']);

const SETTLED = new Set<PurchasePhase['phase']>(['succeeded', 'refunded', 'failed']);

export const purchaseBusy = (phase: PurchasePhase) => BUSY.has(phase.phase);

export function createPurchaseStore(deps: PurchaseDeps) {
  const store = createStore<PurchaseState>(IDLE);
  const get = store.get;
  const patch = (next: Partial<PurchaseState>) => store.set({ ...get(), ...next });
  let generation = 0;
  let listener: { remove(): void } | null = null;
  const inFlight = new Map<string, Promise<ForwardOutcome | null>>();
  const live = (userId: string, at: number) => at === generation && get().userId === userId;

  const coinsOf = (productId: string) => {
    const { packs } = get();
    const pack =
      packs.status === 'idle' ? null : packs.data?.find((p) => p.productId === productId);
    return pack?.coins ?? null;
  };

  const withoutKept = (id: string) => get().kept.filter((kept) => kept !== id);

  function forward(transaction: StoreTransaction, userId: string, at: number) {
    const running = inFlight.get(transaction.transactionId);
    if (running) return running;
    const work = (async () => {
      const outcome = await forwardTransaction(transaction, deps.verify, deps.store.finish).catch(
        () => null,
      );
      inFlight.delete(transaction.transactionId);
      if (!live(userId, at)) return outcome;
      if (!outcome || outcome.kind === 'kept') {
        if (!transaction.revoked && !get().kept.includes(transaction.transactionId)) {
          patch({ kept: [...get().kept, transaction.transactionId] });
        }
        return outcome;
      }
      const { answer } = outcome;
      const waiting = get().purchase;
      const settles =
        (waiting.phase === 'pending' || waiting.phase === 'processing') &&
        waiting.productId === transaction.productId;
      patch({
        kept: withoutKept(transaction.transactionId),
        credits: get().credits + 1,
        ...(settles
          ? {
              purchase:
                answer.status === 'revoked'
                  ? { phase: 'refunded', productId: transaction.productId }
                  : {
                      phase: 'succeeded',
                      productId: transaction.productId,
                      coins: answer.coins ?? coinsOf(transaction.productId) ?? 0,
                    },
            }
          : {}),
      });
      deps.onCoinsChanged();
      return outcome;
    })();
    inFlight.set(transaction.transactionId, work);
    return work;
  }

  const mine = (transaction: StoreTransaction, userId: string) =>
    transaction.appAccountToken === '' || transaction.appAccountToken === userId.toLowerCase();

  async function receive(transaction: StoreTransaction, userId: string, at: number) {
    if (!live(userId, at) || !mine(transaction, userId)) return;
    await forward(transaction, userId, at);
  }

  async function sweep(userId: string, at: number) {
    const unfinished = await deps.store.unfinished().catch(() => []);
    for (const transaction of unfinished) await receive(transaction, userId, at);
    const revoked = await deps.store.revoked().catch(() => []);
    for (const transaction of revoked) await receive(transaction, userId, at);
  }

  async function loadPacks() {
    const { userId } = get();
    if (!userId) return;
    const at = generation;
    patch({ packs: loading(get().packs) });
    try {
      const server = await deps.packs();
      const result = await deps.store.products(server.map((pack) => pack.productId));
      if (result.status !== 'ok') throw new Error(result.code);
      if (live(userId, at)) patch({ packs: loaded(mergePacks(server, result.products)) });
    } catch {
      if (live(userId, at)) patch({ packs: loadFailed(get().packs) });
    }
  }

  async function buy(productId: string) {
    const { userId, purchase } = get();
    if (!userId || purchaseBusy(purchase)) return;
    const at = generation;
    patch({ purchase: { phase: 'buying', productId } });
    const result = await deps.store
      .purchase(productId, userId)
      .catch(() => ({ status: 'failed' as const, code: 'unknown' as const }));
    if (!live(userId, at)) return;
    if (result.status !== 'purchased') {
      return patch({
        purchase:
          result.status === 'cancelled'
            ? { phase: 'idle' }
            : result.status === 'pending'
              ? { phase: 'pending', productId }
              : {
                  phase: 'failed',
                  productId,
                  reason: result.status === 'notAllowed' ? 'notAllowed' : 'failed',
                },
      });
    }
    patch({ purchase: { phase: 'verifying', productId } });
    const outcome = await forward(result.transaction, userId, at);
    if (!live(userId, at)) return;
    if (!outcome || outcome.kind === 'kept') {
      patch({ purchase: { phase: 'processing', productId } });
      return;
    }
    patch({
      purchase:
        outcome.answer.status === 'revoked'
          ? { phase: 'refunded', productId }
          : {
              phase: 'succeeded',
              productId,
              coins: outcome.answer.coins ?? coinsOf(productId) ?? 0,
            },
    });
  }

  async function recheck() {
    const { userId, rechecking } = get();
    if (!userId || rechecking) return;
    const at = generation;
    patch({ rechecking: true });
    const unfinished = await deps.store.unfinished().catch(() => []);
    const kept = new Set(get().kept);
    for (const transaction of unfinished) {
      if (kept.has(transaction.transactionId)) await receive(transaction, userId, at);
    }
    if (live(userId, at)) patch({ rechecking: false });
  }

  function clear() {
    generation += 1;
    listener?.remove();
    listener = null;
    inFlight.clear();
    store.set(IDLE);
  }

  return {
    getSnapshot: get,
    subscribe: store.subscribe,
    start(userId: string) {
      if (get().userId === userId) return;
      clear();
      patch({ userId });
      const at = generation;
      listener = deps.store.listen((transaction) => void receive(transaction, userId, at));
      return sweep(userId, at);
    },
    clear,
    loadPacks,
    openPacks() {
      const { packs } = get();
      if (packs.status !== 'ready' && packs.status !== 'loading') void loadPacks();
    },
    buy,
    recheck,
    dismiss() {
      if (SETTLED.has(get().purchase.phase)) patch({ purchase: { phase: 'idle' } });
    },
  };
}

export type PurchaseStore = ReturnType<typeof createPurchaseStore>;

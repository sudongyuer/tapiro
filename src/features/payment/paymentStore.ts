import { createStore } from '@/lib/store';

import type { Payment, PaymentService } from './types';

export type PaymentListState =
  | { status: 'idle' }
  | { status: 'loading' | 'failed'; userId: string; payments: Payment[] }
  | { status: 'ready' | 'stale'; userId: string; payments: Payment[] };

export type ActionResult<T> = { ok: true; value: T } | { ok: false };

export function createPaymentStore(service: PaymentService) {
  const store = createStore<PaymentListState>({ status: 'idle' });
  const isCurrent = (userId: string) => {
    const state = store.get();
    return state.status !== 'idle' && state.userId === userId;
  };

  async function reload(userId: string) {
    try {
      const payments = await service.list(userId);
      if (isCurrent(userId)) store.set({ status: 'ready', userId, payments });
    } catch {
      const state = store.get();
      if (!isCurrent(userId) || state.status === 'idle') return;
      store.set(
        state.status === 'ready' || state.status === 'stale'
          ? { status: 'stale', userId, payments: state.payments }
          : { status: 'failed', userId, payments: [] },
      );
    }
  }

  return {
    service,
    getSnapshot: store.get,
    subscribe: store.subscribe,
    async ensureLoaded(userId: string) {
      const state = store.get();
      if (isCurrent(userId) && state.status !== 'failed') {
        if (state.status === 'stale') await reload(userId);
        return;
      }
      store.set({ status: 'loading', userId, payments: [] });
      await reload(userId);
    },
    reload,
    clear: () => store.set({ status: 'idle' }),
    async run<T>(userId: string, action: () => Promise<T>): Promise<ActionResult<T>> {
      let result: ActionResult<T>;
      try {
        result = { ok: true, value: await action() };
      } catch {
        result = { ok: false };
      }
      await reload(userId);
      return result;
    },
  };
}

export type PaymentStore = ReturnType<typeof createPaymentStore>;

import { onReturnToForeground, type AppStateSource } from '@/lib/foreground';
import { createAnswerOrder } from '@/lib/answerOrder';
import { createStore } from '@/lib/store';

import type { LiveBountyService, LiveRow, SeenCard } from './types';

export type LiveBountiesState =
  | { status: 'idle' }
  | { status: 'loading' | 'failed' | 'ready' | 'stale'; userId: string; rows: LiveRow[] };

export function createLiveBountyStore(service: LiveBountyService) {
  const store = createStore<LiveBountiesState>({ status: 'idle' });
  const seen = new Set<string>();
  const marking = new Set<string>();
  let generation = 0;
  const order = createAnswerOrder();

  const isCurrent = (userId: string, at: number) => {
    const state = store.get();
    return at === generation && state.status !== 'idle' && state.userId === userId;
  };

  async function reload(userId: string) {
    const at = generation;
    const request = order.start();
    try {
      const rows = await service.list();
      const status = order.succeeded(request);
      if (status && isCurrent(userId, at)) store.set({ status, userId, rows });
    } catch {
      const state = store.get();
      if (!order.failed(request) || !isCurrent(userId, at) || state.status === 'idle') return;
      store.set(
        state.status === 'ready' || state.status === 'stale'
          ? { status: 'stale', userId, rows: state.rows }
          : { status: 'failed', userId, rows: [] },
      );
    }
  }

  async function ensureLoaded(userId: string) {
    const state = store.get();
    if (state.status !== 'idle' && state.userId === userId && state.status !== 'failed') {
      if (state.status === 'stale') await reload(userId);
      return;
    }
    store.set({ status: 'loading', userId, rows: [] });
    await reload(userId);
  }

  function clear() {
    generation += 1;
    seen.clear();
    marking.clear();
    store.set({ status: 'idle' });
  }

  return {
    getSnapshot: store.get,
    subscribe: store.subscribe,
    ensureLoaded,
    reload,
    clear,
    retry() {
      const state = store.get();
      if (state.status !== 'idle') return ensureLoaded(state.userId);
    },
    async markSeen(bountyId: string, card: SeenCard) {
      const key = `${bountyId}:${card}`;
      if (seen.has(key) || marking.has(key)) return;
      const at = generation;
      marking.add(key);
      const marked = await service.markSeen(bountyId, card);
      if (at !== generation) return;
      marking.delete(key);
      if (!marked) throw new Error('mark_bounty_seen failed');
      seen.add(key);
    },
    follow(userId: string | null, appState: AppStateSource) {
      if (!userId) {
        clear();
        return () => undefined;
      }
      ensureLoaded(userId);
      const subscription = onReturnToForeground(appState, () => reload(userId));
      return subscription;
    },
  };
}

export type LiveBountyStore = ReturnType<typeof createLiveBountyStore>;

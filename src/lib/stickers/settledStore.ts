import { createStore } from '@/lib/store';

import type { CollectResult, SettledRow, SettledService } from './settled';

export type SettledState =
  | { status: 'idle' }
  | { status: 'loading' | 'failed' | 'ready' | 'stale'; userId: string; rows: SettledRow[] };

type AppStateSource = {
  addEventListener: (type: 'change', listener: (state: string) => void) => { remove: () => void };
};

export function createSettledStore(service: SettledService) {
  const store = createStore<SettledState>({ status: 'idle' });
  const collected = new Set<string>();
  const dismissed = new Set<string>();
  const unmarked = new Set<string>();
  let generation = 0;

  const isCurrent = (userId: string, at: number) => {
    const state = store.get();
    return at === generation && state.status !== 'idle' && state.userId === userId;
  };

  const shown = (rows: readonly SettledRow[], hidden: ReadonlySet<string>) =>
    rows.filter((row) => !hidden.has(row.stickerId));

  const write = (stickerId: string) =>
    service.collect(stickerId).catch((): CollectResult => 'failed');

  async function mark(stickerId: string) {
    const result = await write(stickerId);
    if (result === 'failed') unmarked.add(stickerId);
    return result;
  }

  async function retryUnmarked() {
    const retries = [...unmarked];
    unmarked.clear();
    await Promise.all(retries.map(write));
  }

  async function reload(userId: string) {
    const at = generation;
    await retryUnmarked();
    try {
      const rows = await service.list();
      if (isCurrent(userId, at))
        store.set({ status: 'ready', userId, rows: shown(rows, collected) });
    } catch {
      const state = store.get();
      if (!isCurrent(userId, at) || state.status === 'idle') return;
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
    collected.clear();
    dismissed.clear();
    unmarked.clear();
    store.set({ status: 'idle' });
  }

  function dismiss(stickerId: string) {
    collected.add(stickerId);
    dismissed.add(stickerId);
    const state = store.get();
    if (state.status !== 'idle') store.set({ ...state, rows: shown(state.rows, dismissed) });
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
    collect(stickerId: string): Promise<CollectResult> {
      if (collected.has(stickerId)) return Promise.resolve('collected');
      collected.add(stickerId);
      return mark(stickerId);
    },
    dismiss,
    follow(userId: string | null, appState: AppStateSource) {
      if (!userId) {
        clear();
        return () => undefined;
      }
      ensureLoaded(userId);
      const subscription = appState.addEventListener('change', (next) => {
        if (next === 'active') reload(userId);
      });
      return () => subscription.remove();
    },
  };
}

export type SettledStore = ReturnType<typeof createSettledStore>;

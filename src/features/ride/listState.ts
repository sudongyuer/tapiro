import { createStore } from '@/lib/store';

import { mergePage } from './listModel';
import type { NearbyCursor, NearbyPage, RideListData } from './types';

export type RideListState =
  | { kind: 'loading' }
  | { kind: 'failed'; busy: boolean }
  | {
      kind: 'ready';
      data: RideListData;
      loadedAt: string;
      stale: boolean;
      busy: boolean;
      page: 'idle' | 'loading' | 'failed';
    };

export type RideListDeps = {
  load: () => Promise<RideListData>;
  more: (after: NearbyCursor) => Promise<NearbyPage>;
  now: () => Date;
};

export function createRideList(deps: RideListDeps) {
  const store = createStore<RideListState>({ kind: 'loading' });
  let run = 0;

  async function load() {
    const current = store.get();
    const ticket = ++run;
    if (current.kind === 'ready') store.set({ ...current, busy: true });
    else if (current.kind === 'failed') store.set({ kind: 'failed', busy: true });
    try {
      const data = await deps.load();
      if (ticket !== run) return;
      store.set({
        kind: 'ready',
        data,
        loadedAt: deps.now().toISOString(),
        stale: false,
        busy: false,
        page: 'idle',
      });
    } catch {
      if (ticket !== run) return;
      const latest = store.get();
      store.set(
        latest.kind === 'ready'
          ? { ...latest, stale: true, busy: false }
          : { kind: 'failed', busy: false },
      );
    }
  }

  async function more() {
    const current = store.get();
    if (current.kind !== 'ready' || !current.data.next || current.page === 'loading') return;
    const ticket = run;
    store.set({ ...current, page: 'loading' });
    try {
      const page = await deps.more(current.data.next);
      const latest = store.get();
      if (ticket !== run || latest.kind !== 'ready') return;
      store.set({ ...latest, data: mergePage(latest.data, page), page: 'idle' });
    } catch {
      const latest = store.get();
      if (ticket !== run || latest.kind !== 'ready') return;
      store.set({ ...latest, page: 'failed' });
    }
  }

  return { get: store.get, subscribe: store.subscribe, load, more };
}

export type RideList = ReturnType<typeof createRideList>;

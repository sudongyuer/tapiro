import { createStore } from '@/lib/store';

import type { RideSummary } from './types';

export type RideHistoryState =
  | { kind: 'loading' }
  | { kind: 'failed'; busy: boolean }
  | { kind: 'ready'; rides: RideSummary[]; loadedAt: string; stale: boolean; busy: boolean };

export function createRideHistory(deps: { load: () => Promise<RideSummary[]>; now: () => Date }) {
  const store = createStore<RideHistoryState>({ kind: 'loading' });
  let run = 0;

  async function load() {
    const current = store.get();
    const ticket = ++run;
    if (current.kind === 'ready') store.set({ ...current, busy: true });
    else if (current.kind === 'failed') store.set({ kind: 'failed', busy: true });
    try {
      const rides = await deps.load();
      if (ticket !== run) return;
      store.set({
        kind: 'ready',
        rides,
        loadedAt: deps.now().toISOString(),
        stale: false,
        busy: false,
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

  return { get: store.get, subscribe: store.subscribe, load };
}

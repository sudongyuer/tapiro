import { createStore } from '@/lib/store';

import { RideDetailMissing } from './detailService';
import type { RideDetail, RideFailure, RideWrite } from './types';

export type DetailLoad =
  | { kind: 'loading' }
  | { kind: 'failed'; busy: boolean }
  | { kind: 'gone' }
  | { kind: 'ready'; detail: RideDetail; loadedAt: number; stale: boolean; busy: boolean };

export type DetailAction =
  | 'request'
  | 'withdraw'
  | 'decide'
  | 'leave'
  | 'cancel'
  | 'arrive'
  | 'undoArrive'
  | 'late'
  | 'reviseTime'
  | 'updateDetails'
  | 'splitMode'
  | 'depart'
  | 'appeal'
  | 'confirmAppeal';

export type ActionState =
  | { kind: 'idle' }
  | { kind: 'busy'; action: DetailAction; target: string | null }
  | { kind: 'failed'; action: DetailAction; reason: RideFailure };

export type DetailState = { load: DetailLoad; action: ActionState };

export type DetailDeps = { load: () => Promise<RideDetail>; now: () => number };

export function createRideDetail(deps: DetailDeps) {
  const store = createStore<DetailState>({ load: { kind: 'loading' }, action: { kind: 'idle' } });
  let run = 0;

  const setLoad = (load: DetailLoad) => store.set({ ...store.get(), load });

  async function load() {
    const current = store.get().load;
    const ticket = ++run;
    if (current.kind === 'ready') setLoad({ ...current, busy: true });
    else if (current.kind === 'failed') setLoad({ kind: 'failed', busy: true });
    try {
      const detail = await deps.load();
      if (ticket !== run) return;
      setLoad({ kind: 'ready', detail, loadedAt: deps.now(), stale: false, busy: false });
    } catch (error) {
      if (ticket !== run) return;
      if (error instanceof RideDetailMissing) {
        setLoad({ kind: 'gone' });
        return;
      }
      const latest = store.get().load;
      setLoad(
        latest.kind === 'ready'
          ? { ...latest, stale: true, busy: false }
          : { kind: 'failed', busy: false },
      );
    }
  }

  async function act<T>(
    action: DetailAction,
    write: () => Promise<RideWrite<T>>,
    target: string | null = null,
  ): Promise<RideWrite<T> | null> {
    if (store.get().action.kind === 'busy') return null;
    store.set({ ...store.get(), action: { kind: 'busy', action, target } });
    const answer = await write();
    store.set({
      ...store.get(),
      action: answer.ok ? { kind: 'idle' } : { kind: 'failed', action, reason: answer.reason },
    });
    if (answer.ok || answer.reason !== 'failed') await load();
    return answer;
  }

  async function peek<T>(
    action: DetailAction,
    read: () => Promise<RideWrite<T>>,
  ): Promise<T | null> {
    if (store.get().action.kind === 'busy') return null;
    store.set({ ...store.get(), action: { kind: 'busy', action, target: null } });
    const answer = await read();
    store.set({
      ...store.get(),
      action: answer.ok ? { kind: 'idle' } : { kind: 'failed', action, reason: answer.reason },
    });
    if (!answer.ok && answer.reason !== 'failed') await load();
    return answer.ok ? answer.value : null;
  }

  const clearFailure = () => {
    if (store.get().action.kind === 'failed')
      store.set({ ...store.get(), action: { kind: 'idle' } });
  };

  return { get: store.get, subscribe: store.subscribe, load, act, peek, clearFailure };
}

export type RideDetailStore = ReturnType<typeof createRideDetail>;

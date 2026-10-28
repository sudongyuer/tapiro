import { createStore } from '@/lib/store';

import type { BlockService, BlockedPerson } from './types';

export type BlockState = 'idle' | 'busy' | 'failed';

export function createBlockFlow(deps: {
  service: Pick<BlockService, 'block'>;
  blocked: (posterId: string) => void;
}) {
  const store = createStore<BlockState>('idle');
  return {
    get: store.get,
    subscribe: store.subscribe,
    async block(posterId: string): Promise<boolean> {
      if (store.get() === 'busy') return false;
      store.set('busy');
      const answer = await deps.service.block(posterId).catch(() => null);
      if (answer === null) {
        store.set('failed');
        return false;
      }
      store.set('idle');
      deps.blocked(posterId);
      return true;
    },
  };
}

export type BlockListState =
  | { kind: 'loading' }
  | { kind: 'failed'; retrying: boolean }
  | {
      kind: 'ready';
      people: readonly BlockedPerson[];
      unblocking: readonly string[];
      unblockFailed: boolean;
      refreshFailed: boolean;
    };

export function createBlockList(service: BlockService) {
  const store = createStore<BlockListState>({ kind: 'loading' });
  let request = 0;

  async function load() {
    const current = ++request;
    if (store.get().kind === 'failed') store.set({ kind: 'failed', retrying: true });
    try {
      const people = await service.list();
      if (current !== request) return;
      const now = store.get();
      store.set({
        kind: 'ready',
        people,
        unblocking: now.kind === 'ready' ? now.unblocking : [],
        unblockFailed: now.kind === 'ready' && now.unblockFailed,
        refreshFailed: false,
      });
    } catch {
      if (current !== request) return;
      const now = store.get();
      store.set(
        now.kind === 'ready'
          ? { ...now, refreshFailed: true }
          : { kind: 'failed', retrying: false },
      );
    }
  }

  async function unblock(id: string) {
    const now = store.get();
    if (now.kind !== 'ready' || now.unblocking.includes(id)) return;
    store.set({ ...now, unblocking: [...now.unblocking, id], unblockFailed: false });
    let ok = true;
    await service.unblock(id).catch(() => {
      ok = false;
    });
    if (ok) request += 1;
    const after = store.get();
    if (after.kind !== 'ready') return;
    const unblocking = after.unblocking.filter((other) => other !== id);
    store.set(
      ok
        ? { ...after, unblocking, people: after.people.filter((person) => person.id !== id) }
        : { ...after, unblocking, unblockFailed: true },
    );
  }

  return { get: store.get, subscribe: store.subscribe, load, unblock };
}

export type BlockList = ReturnType<typeof createBlockList>;

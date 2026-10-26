import type { Sticker, StickerService } from './model';

export type StickerState =
  | { status: 'idle' }
  | { status: 'loading'; userId: string }
  | { status: 'ready'; userId: string; stickers: Sticker[] }
  | { status: 'stale'; userId: string; stickers: Sticker[] }
  | { status: 'failed'; userId: string };

type AppStateSource = {
  addEventListener(type: 'change', listener: (state: string) => void): { remove: () => void };
};

export function createStickerStore(service: StickerService) {
  let state: StickerState = { status: 'idle' };
  let generation = 0;
  const listeners = new Set<() => void>();

  function set(next: StickerState) {
    state = next;
    for (const listener of listeners) listener();
  }

  async function fetch(userId: string, keep: Sticker[] | null) {
    const mine = ++generation;
    if (!keep) set({ status: 'loading', userId });
    try {
      const stickers = await service.list(userId);
      if (mine === generation) set({ status: 'ready', userId, stickers });
    } catch {
      if (mine !== generation) return;
      set(keep ? { status: 'stale', userId, stickers: keep } : { status: 'failed', userId });
    }
  }

  const known = (userId: string) =>
    (state.status === 'ready' || state.status === 'stale') && state.userId === userId
      ? state.stickers
      : null;

  const store = {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    ensureLoaded(userId: string) {
      if (state.status !== 'idle' && state.status !== 'failed' && state.userId === userId)
        return Promise.resolve();
      return fetch(userId, null);
    },
    reload: (userId: string) => fetch(userId, null),
    refresh: (userId: string) => fetch(userId, known(userId)),
    clear() {
      generation += 1;
      set({ status: 'idle' });
    },
    follow(userId: string | null, appState: AppStateSource) {
      if (!userId) {
        store.clear();
        return () => undefined;
      }
      store.ensureLoaded(userId);
      const subscription = appState.addEventListener('change', (next) => {
        if (next === 'active') store.refresh(userId);
      });
      return () => {
        subscription.remove();
        store.clear();
      };
    },
  };
  return store;
}

export type StickerStore = ReturnType<typeof createStickerStore>;

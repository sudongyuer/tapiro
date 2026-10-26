import type { Sticker, StickerService } from './model';

export type StickerState =
  | { status: 'idle' }
  | { status: 'loading'; userId: string }
  | { status: 'ready'; userId: string; stickers: Sticker[] }
  | { status: 'failed'; userId: string };

export function createStickerStore(service: StickerService) {
  let state: StickerState = { status: 'idle' };
  let generation = 0;
  const listeners = new Set<() => void>();

  function set(next: StickerState) {
    state = next;
    for (const listener of listeners) listener();
  }

  async function load(userId: string) {
    const mine = ++generation;
    set({ status: 'loading', userId });
    try {
      const stickers = await service.list(userId);
      if (mine === generation) set({ status: 'ready', userId, stickers });
    } catch {
      if (mine === generation) set({ status: 'failed', userId });
    }
  }

  return {
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
      return load(userId);
    },
    reload: load,
    clear() {
      generation += 1;
      set({ status: 'idle' });
    },
  };
}

export type StickerStore = ReturnType<typeof createStickerStore>;

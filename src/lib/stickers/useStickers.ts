import { useEffect, useSyncExternalStore } from 'react';

import { stickerStore } from './instance';
import type { Sticker } from './model';

export type StickersView =
  | { status: 'loading' }
  | { status: 'failed'; retry: () => void }
  | { status: 'ready'; stickers: Sticker[] };

export function useStickers(userId: string | null): StickersView {
  const state = useSyncExternalStore(stickerStore.subscribe, stickerStore.getSnapshot);
  useEffect(() => {
    if (userId) stickerStore.ensureLoaded(userId);
  }, [userId]);
  if (!userId || state.status === 'idle' || state.userId !== userId) return { status: 'loading' };
  if (state.status === 'ready') return { status: 'ready', stickers: state.stickers };
  if (state.status === 'failed')
    return { status: 'failed', retry: () => stickerStore.reload(userId) };
  return { status: 'loading' };
}

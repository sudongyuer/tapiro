import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

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

export function useLiveStickers(userId: string | null) {
  useEffect(() => {
    if (!userId) {
      stickerStore.clear();
      return;
    }
    stickerStore.ensureLoaded(userId);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') stickerStore.reload(userId);
    });
    return () => subscription.remove();
  }, [userId]);
}

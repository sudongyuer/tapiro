import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { stickerStore } from './instance';
import { settledStore } from './live';
import type { Sticker } from './model';

export type StickersView =
  | { status: 'loading' }
  | { status: 'failed'; retry: () => void }
  | { status: 'stale'; stickers: Sticker[]; retry: () => void }
  | { status: 'ready'; stickers: Sticker[] };

export function useStickers(userId: string | null): StickersView {
  const state = useSyncExternalStore(stickerStore.subscribe, stickerStore.getSnapshot);
  useEffect(() => {
    if (userId) stickerStore.ensureLoaded(userId);
  }, [userId]);
  if (!userId || state.status === 'idle' || state.userId !== userId) return { status: 'loading' };
  if (state.status === 'ready') return { status: 'ready', stickers: state.stickers };
  if (state.status === 'stale')
    return { status: 'stale', stickers: state.stickers, retry: () => stickerStore.refresh(userId) };
  if (state.status === 'failed')
    return { status: 'failed', retry: () => stickerStore.reload(userId) };
  return { status: 'loading' };
}

export function useLiveStickers(userId: string | null) {
  useEffect(() => stickerStore.follow(userId, AppState), [userId]);
  useEffect(() => settledStore.follow(userId, AppState), [userId]);
}

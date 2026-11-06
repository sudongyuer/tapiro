import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import type { CoinsState } from './coinsStore';
import { coinsStore, followCoins } from './services';

export function useLiveCoins(userId: string | null) {
  useEffect(() => followCoins(userId, AppState), [userId]);
}

const useCoins = <T>(select: (state: CoinsState) => T) =>
  useSyncExternalStore(coinsStore.subscribe, () => select(coinsStore.getSnapshot()));

function useLoad(load: () => void) {
  const userId = useCoins((state) => state.userId);
  useEffect(() => {
    if (userId) load();
  }, [userId, load]);
}

export function useCoinBalance() {
  useLoad(coinsStore.loadBalance);
  return useCoins((state) => state.balance);
}

export function useCoinHistory() {
  useLoad(coinsStore.loadHistory);
  return useCoins((state) => state.history);
}

export function useWeeklyFeed() {
  useLoad(coinsStore.loadFeedStatus);
  const status = useCoins((state) => state.feedStatus);
  const feed = useCoins((state) => state.feed);
  return { status, feed };
}

export function useInvite() {
  useLoad(coinsStore.loadInvite);
  const invite = useCoins((state) => state.invite);
  const redeem = useCoins((state) => state.redeem);
  return { invite, redeem };
}

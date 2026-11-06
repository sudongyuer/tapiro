import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import type { CoinsState, LoadKey } from './coinsStore';
import { coinsStore, followCoins } from './services';

export function useLiveCoins(userId: string | null) {
  useEffect(() => followCoins(userId, AppState), [userId]);
}

const useCoins = <T>(select: (state: CoinsState) => T) =>
  useSyncExternalStore(coinsStore.subscribe, () => select(coinsStore.getSnapshot()));

function useOnScreen(key: LoadKey) {
  const userId = useCoins((state) => state.userId);
  useFocusEffect(
    useCallback(() => {
      if (userId) return coinsStore.open(key);
    }, [key, userId]),
  );
}

export function useCoinBalance() {
  useOnScreen('balance');
  return useCoins((state) => state.balance);
}

export function useCoinHistory() {
  useOnScreen('history');
  return useCoins((state) => state.history);
}

export function useWeeklyFeed() {
  useOnScreen('feedStatus');
  const status = useCoins((state) => state.feedStatus);
  const feed = useCoins((state) => state.feed);
  return { status, feed };
}

export function useInvite() {
  useOnScreen('invite');
  const invite = useCoins((state) => state.invite);
  const redeem = useCoins((state) => state.redeem);
  return { invite, redeem };
}

export function useCoinsReadFailed(key: LoadKey) {
  return useCoins((state) => state.readFailed[key] === true);
}

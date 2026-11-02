import { useFocusEffect, useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { rideDetailService } from '../services';
import { POLL_MS, shouldPoll } from './detailModel';
import { createRideDetail } from './detailState';

export function useRideDetail(id: string, now: number) {
  const [store] = useState(() =>
    createRideDetail({ load: () => rideDetailService.load(id), now: () => Date.now() }),
  );
  const state = useSyncExternalStore(store.subscribe, store.get);
  const shown = useRef(false);

  useEffect(() => {
    void store.load();
  }, [store]);

  useFocusEffect(
    useCallback(() => {
      if (shown.current) void store.load();
      shown.current = true;
    }, [store]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') void store.load();
    });
    return () => subscription.remove();
  }, [store]);

  const detail = state.load.kind === 'ready' ? state.load.detail : null;
  const focused = useIsFocused();
  const polling = focused && shouldPoll(detail, now);
  useEffect(() => {
    if (!polling) return;
    const timer = setInterval(() => void store.load(), POLL_MS);
    return () => clearInterval(timer);
  }, [polling, store]);

  return { state, store };
}

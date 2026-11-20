import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { createRideHistory } from './historyState';
import { rideCache, rideService } from './services';

export function useRideHistory() {
  const [history] = useState(() =>
    createRideHistory({
      async load() {
        const rides = await rideService.history();
        rideCache.remember(rides);
        return rides;
      },
      now: () => new Date(),
    }),
  );
  const state = useSyncExternalStore(history.subscribe, history.get);
  const [pulling, setPulling] = useState(false);
  const shown = useRef(false);

  useEffect(() => {
    void history.load();
  }, [history]);

  useFocusEffect(
    useCallback(() => {
      if (shown.current) void history.load();
      shown.current = true;
    }, [history]),
  );

  const pull = useCallback(async () => {
    setPulling(true);
    await history.load();
    setPulling(false);
  }, [history]);

  return { state, reload: history.load, pull, pulling };
}

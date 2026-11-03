import { useFocusEffect, useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { onReturnToForeground } from '@/lib/foreground';
import { useI18n } from '@/lib/i18n';
import { useLiveSignal } from '@/lib/live';

import { fromDetail } from '../reminders/inputs';
import { syncOneRide } from '../reminders/useRideReminders';
import { rideDetailService } from '../services';
import { POLL_MS, shouldPoll } from './detailModel';
import { createRideDetail } from './detailState';

export function useRideDetail(id: string, now: number, userId: string) {
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
    const subscription = onReturnToForeground(AppState, () => void store.load());
    return subscription;
  }, [store]);

  const { t, language } = useI18n();
  useEffect(() => {
    const { load } = state;
    if (load.kind === 'ready' && !load.stale) {
      void syncOneRide(id, fromDetail(load.detail, userId), load.loadedAt, t, language);
    } else if (load.kind === 'gone') {
      void syncOneRide(id, null, Date.now(), t, language);
    }
  }, [state, id, userId, t, language]);

  const detail = state.load.kind === 'ready' ? state.load.detail : null;
  const focused = useIsFocused();
  useLiveSignal(
    ['ride.', 'payment.'],
    (signal) => {
      if (!signal || signal.kind.startsWith('payment.') || signal.id === id) void store.load();
    },
    focused,
  );
  const polling = focused && shouldPoll(detail, now);
  useEffect(() => {
    if (!polling) return;
    const timer = setInterval(() => void store.load(), POLL_MS);
    return () => clearInterval(timer);
  }, [polling, store]);

  return { state, store };
}

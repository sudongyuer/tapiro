import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useSyncExternalStore } from 'react';

import { askSession, consentStore } from './services';

export function useConsentState() {
  return useSyncExternalStore(consentStore.subscribe, consentStore.getSnapshot);
}

export function useConsentFor(userId: string | null) {
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      consentStore.dismissFailure();
      if (consentStore.getSnapshot().userId === userId) void consentStore.refresh();
      else consentStore.start(userId);
    }, [userId]),
  );
  return useConsentState();
}

export function useAskSession(userId: string | null) {
  useEffect(() => {
    if (userId) askSession.open(userId);
  }, [userId]);
  const state = useSyncExternalStore(askSession.subscribe, askSession.getSnapshot);
  return state.userId === userId ? state : null;
}

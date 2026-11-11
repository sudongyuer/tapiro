import { useFocusEffect } from 'expo-router';
import { useCallback, useLayoutEffect, useSyncExternalStore } from 'react';

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

// Opened before paint, so a reopened sheet never shows the previous open's turns for a frame.
export function useAskSession(userId: string | null) {
  useLayoutEffect(() => {
    if (userId) askSession.open(userId);
  }, [userId]);
  const state = useSyncExternalStore(askSession.subscribe, askSession.getSnapshot);
  return state.userId === userId ? state : null;
}

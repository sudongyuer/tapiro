import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useSyncExternalStore } from 'react';

import { askSession, consentStore, pantryStore, voice } from './services';

export function useConsentState() {
  return useSyncExternalStore(consentStore.subscribe, consentStore.getSnapshot);
}

export function useConsentFor(userId: string | null) {
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      consentStore.dismissFailure();
      pantryStore.dismissFailure();
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

export function usePantry() {
  return useSyncExternalStore(pantryStore.subscribe, pantryStore.getSnapshot);
}

export function useVoice(language: string, openConsent: () => void) {
  useEffect(() => voice.attach({ language, openConsent }), [language, openConsent]);
  return useSyncExternalStore(voice.subscribe, voice.getSnapshot);
}

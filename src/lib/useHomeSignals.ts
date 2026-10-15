import { useEffect, useRef, useSyncExternalStore } from 'react';

import { homeSignals } from './homeSignals';

export function useLiveCardsOnScreen() {
  return useSyncExternalStore(
    homeSignals.liveCardsOnScreen.subscribe,
    homeSignals.liveCardsOnScreen.get,
  );
}

export function useHomeReveal(onReveal: () => void) {
  const latest = useRef(onReveal);
  useEffect(() => {
    latest.current = onReveal;
  }, [onReveal]);
  useEffect(() => homeSignals.revealRequests.subscribe(() => latest.current()), []);
}

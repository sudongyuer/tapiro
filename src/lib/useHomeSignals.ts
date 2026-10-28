import { useEffect, useRef, useSyncExternalStore } from 'react';

import { homeSignals } from './homeSignals';

export function useLiveCardsOnScreen() {
  return useSyncExternalStore(
    homeSignals.liveCardsOnScreen.subscribe,
    homeSignals.liveCardsOnScreen.get,
  );
}

export function useHomeReveal(onReveal: () => void, onTop: () => void) {
  const latest = useRef({ onReveal, onTop });
  useEffect(() => {
    latest.current = { onReveal, onTop };
  }, [onReveal, onTop]);
  useEffect(() => homeSignals.revealRequests.subscribe(() => latest.current.onReveal()), []);
  useEffect(() => homeSignals.topRequests.subscribe(() => latest.current.onTop()), []);
}

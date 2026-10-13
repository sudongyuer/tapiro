import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { homeSignals } from './homeSignals';
import { shellFeed } from './services';
import { tabLocation, type TabLocation } from './tabs';

export function useShellFeed() {
  return useSyncExternalStore(shellFeed.subscribe, shellFeed.getSnapshot);
}

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

const INITIAL_LOCATION: TabLocation = { tab: 'bounty', onRoot: true };

// Root sheets (问小貘, delete account) cover the tabs without leaving them; keep the tab underneath.
export function useTabLocation(segments: readonly string[]) {
  const current = tabLocation(segments);
  const [last, setLast] = useState(current ?? INITIAL_LOCATION);
  if (current && (current.tab !== last.tab || current.onRoot !== last.onRoot)) {
    setLast(current);
    return current;
  }
  return last;
}

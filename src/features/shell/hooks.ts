import { useState } from 'react';

import { tabLocation, type TabLocation } from './tabs';

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

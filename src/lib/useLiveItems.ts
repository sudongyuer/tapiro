import { useSyncExternalStore } from 'react';
import { Settings } from 'react-native';

import { createLiveItems, EMPTY_LIVE_ITEMS, fixtureLiveItems, withoutMoney } from './liveItems';
import { uiVerify, uiVerifyArgument, uiVerifyFixture } from './uiVerify';

const SEEN_KEY = 'uiVerifyHomeSeen';

function verifyFeed() {
  Settings.set({ [SEEN_KEY]: '' });
  const seen: string[] = [];
  const markSeen = async (bountyId: string) => {
    seen.push(bountyId);
    Settings.set({ [SEEN_KEY]: JSON.stringify(seen) });
  };
  return withoutMoney(
    fixtureLiveItems(uiVerifyArgument('uiVerifyShellFeed'), uiVerifyFixture, markSeen),
  );
}

export const liveItems = createLiveItems(uiVerify ? verifyFeed() : EMPTY_LIVE_ITEMS);

export function useLiveItems() {
  return useSyncExternalStore(liveItems.subscribe, liveItems.getSnapshot);
}

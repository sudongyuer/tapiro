import { useSyncExternalStore } from 'react';

import { createLiveItems, EMPTY_LIVE_ITEMS, fixtureLiveItems } from './liveItems';
import { uiVerify, uiVerifyArgument, uiVerifyFixture } from './uiVerify';

export const liveItems = createLiveItems(
  uiVerify
    ? fixtureLiveItems(uiVerifyArgument('uiVerifyShellFeed'), uiVerifyFixture)
    : EMPTY_LIVE_ITEMS,
);

export function useLiveItems() {
  return useSyncExternalStore(liveItems.subscribe, liveItems.getSnapshot);
}

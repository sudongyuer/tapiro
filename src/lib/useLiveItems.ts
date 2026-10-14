import { useSyncExternalStore } from 'react';

import { createLiveItems, EMPTY_LIVE_ITEMS, fixtureLiveItems } from './liveItems';
import { uiVerify, uiVerifyArgument } from './uiVerify';

export const liveItems = createLiveItems(
  uiVerify ? fixtureLiveItems(uiVerifyArgument('uiVerifyShellFeed')) : EMPTY_LIVE_ITEMS,
);

export function useLiveItems() {
  return useSyncExternalStore(liveItems.subscribe, liveItems.getSnapshot);
}

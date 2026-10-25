import { useSyncExternalStore } from 'react';

import { createLiveItems, EMPTY_LIVE_ITEMS, fixtureLiveItems, withoutMoney } from './liveItems';
import { uiVerify, uiVerifyArgument, uiVerifyFixture } from './uiVerify';

export const liveItems = createLiveItems(
  uiVerify
    ? withoutMoney(fixtureLiveItems(uiVerifyArgument('uiVerifyShellFeed'), uiVerifyFixture))
    : EMPTY_LIVE_ITEMS,
);

export function useLiveItems() {
  return useSyncExternalStore(liveItems.subscribe, liveItems.getSnapshot);
}

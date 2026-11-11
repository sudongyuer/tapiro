import { useEffect, useRef, useSyncExternalStore } from 'react';

import { purchaseStore } from '../services';
import type { PurchaseState } from './purchaseStore';

export const usePurchase = <T>(select: (state: PurchaseState) => T) =>
  useSyncExternalStore(purchaseStore.subscribe, () => select(purchaseStore.getSnapshot()));

export function useOnCredited(onCredited: (() => void) | undefined) {
  const credits = usePurchase((state) => state.credits);
  const seen = useRef(credits);
  const latest = useRef(onCredited);
  useEffect(() => {
    latest.current = onCredited;
  });
  useEffect(() => {
    if (credits === seen.current) return;
    seen.current = credits;
    latest.current?.();
  }, [credits]);
}

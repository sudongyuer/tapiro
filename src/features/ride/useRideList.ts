import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { evaluateOrigin } from '@/features/place';
import { locationService, type Point } from '@/lib/location';

import { createRideList } from './listState';
import { rideCache, rideService } from './services';

async function viewerPoint(): Promise<Point | null> {
  const origin = await evaluateOrigin(locationService, { chosen: null, dismissed: true });
  return origin.kind === 'none' ? null : origin.point;
}

export function useRideList() {
  const [list] = useState(() => {
    let point: Point | null = null;
    return createRideList({
      async load() {
        point = await viewerPoint();
        const [mine, page] = await Promise.all([
          rideService.mine(),
          rideService.nearby(point, null),
        ]);
        rideCache.remember([...mine.items, ...page.items]);
        return {
          mine: mine.items,
          joinable: page.items,
          historyCount: mine.historyCount,
          next: page.next,
        };
      },
      async more(after) {
        const page = await rideService.nearby(point, after);
        rideCache.remember(page.items);
        return page;
      },
      now: () => new Date(),
    });
  });
  const state = useSyncExternalStore(list.subscribe, list.get);
  const [pulling, setPulling] = useState(false);
  const shown = useRef(false);

  useEffect(() => {
    void list.load();
  }, [list]);

  useFocusEffect(
    useCallback(() => {
      if (shown.current) void list.load();
      shown.current = true;
    }, [list]),
  );

  const pull = useCallback(async () => {
    setPulling(true);
    await list.load();
    setPulling(false);
  }, [list]);

  return { state, reload: list.load, more: list.more, pull, pulling };
}

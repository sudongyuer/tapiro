import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

import { placePick } from '../place/placePick';
import { useBoard } from './useBoard';
import { useCardFocus, type ScrollHost } from './useCardFocus';
import { useOrigin } from './useOrigin';

function useTracked(run: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const start = useCallback(async () => {
    setBusy(true);
    try {
      await run();
    } finally {
      setBusy(false);
    }
  }, [run]);
  return [busy, start] as const;
}

function usePaging(onViewport: (endY: number, bottom: number, height: number) => void) {
  const viewport = useRef<{ top: number; height: number } | null>(null);
  const contentHeight = useRef(0);

  const check = useCallback(() => {
    const seen = viewport.current;
    if (seen) onViewport(contentHeight.current, seen.top + seen.height, seen.height);
  }, [onViewport]);

  const onScroll = useCallback(
    ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
      viewport.current = {
        top: nativeEvent.contentOffset.y,
        height: nativeEvent.layoutMeasurement.height,
      };
      contentHeight.current = nativeEvent.contentSize.height;
      check();
    },
    [check],
  );

  const onContentSizeChange = useCallback(
    (_width: number, height: number) => {
      contentHeight.current = height;
      check();
    },
    [check],
  );

  return { onScroll, onContentSizeChange };
}

function useBoardPlacePick(choose: ReturnType<typeof useOrigin>['choose']) {
  const focused = useIsFocused();
  useEffect(() => {
    if (!focused) return;
    const place = placePick.take('board');
    if (place) {
      choose({
        label: place.name,
        point: { latitude: place.latitude, longitude: place.longitude },
      });
    }
  }, [focused, choose]);
}

type ScrollEvent = NativeSyntheticEvent<NativeScrollEvent>;

export function useBountyBoard(userId: string, host: ScrollHost) {
  const { origin, evaluate, allow, dismiss, choose } = useOrigin(userId);
  const board = useBoard(origin, evaluate);
  const [pulling, pull] = useTracked(board.refresh);
  const [retrying, retryRefresh] = useTracked(board.refresh);
  const [allowing, allowLocation] = useTracked(allow);
  const paging = usePaging(board.onViewport);
  const focus = useCardFocus(host);
  useBoardPlacePick(choose);
  const { handlers } = focus;

  const scrollHandlers = {
    onScroll: (event: ScrollEvent) => {
      paging.onScroll(event);
      handlers.onScroll(event);
    },
    onContentSizeChange: (width: number, height: number) => {
      paging.onContentSizeChange(width, height);
      handlers.onContentSizeChange(width, height);
    },
    onScrollBeginDrag: handlers.onScrollBeginDrag,
    onMomentumScrollEnd: handlers.onMomentumScrollEnd,
  };

  return {
    ...board,
    origin,
    pulling,
    pull,
    retryRefresh,
    retryBusy: retrying || board.refreshing,
    allowing,
    allowLocation,
    dismissLocation: dismiss,
    scrollHandlers,
    focus,
  };
}

export type BountyBoardModel = ReturnType<typeof useBountyBoard>;

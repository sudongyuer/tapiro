import { useCallback, useRef, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

import { useBoard } from './useBoard';
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

export function useBountyBoard(userId: string) {
  const { origin, evaluate } = useOrigin(userId);
  const board = useBoard(origin, evaluate);
  const [pulling, pull] = useTracked(board.refresh);
  const [retrying, retryRefresh] = useTracked(board.refresh);
  const paging = usePaging(board.onViewport);

  return {
    ...board,
    origin,
    pulling,
    pull,
    retryRefresh,
    retryBusy: retrying || board.refreshing,
    paging,
  };
}

export type BountyBoardModel = ReturnType<typeof useBountyBoard>;

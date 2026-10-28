import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { blockEvents } from '../shared/blockEvents';
import { bountyCache } from '../shared/bountyCache';
import { justApplied } from '../shared/justApplied';
import { createBoardController, nearEnd } from './boardState';
import { boardService } from './services';
import type { BoardFilter, BoardOrigin } from './types';
import { useTabFocus } from './useTabFocus';

export function useBoard(
  origin: BoardOrigin | null,
  evaluateOrigin: () => Promise<BoardOrigin | null>,
) {
  const [controller] = useState(() => createBoardController(boardService, undefined, justApplied));
  const [filter, setFilter] = useState<BoardFilter>('all');
  const {
    state,
    refreshing,
    origin: shownOrigin,
  } = useSyncExternalStore(controller.subscribe, controller.get);
  const focused = useIsFocused();
  const focusedRef = useRef(focused);

  useEffect(() => {
    focusedRef.current = focused;
  }, [focused]);

  useEffect(() => {
    if (origin) void controller.setQuery(origin, filter);
  }, [controller, origin, filter]);

  useTabFocus(controller.load);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active' && focusedRef.current) void controller.load();
    });
    return () => subscription.remove();
  }, [controller]);

  useEffect(
    () =>
      bountyCache.onApplicationChange(({ id, applied }) =>
        applied ? controller.applied(id) : controller.withdrawn(id),
      ),
    [controller],
  );

  useEffect(
    () => blockEvents.onBlocked((posterId) => void controller.blocked(posterId)),
    [controller],
  );

  const rows = state.kind === 'ready' ? state.rows : null;
  useEffect(() => {
    if (rows) bountyCache.seed(rows);
  }, [rows]);

  const refresh = useCallback(
    () => controller.refreshFrom(evaluateOrigin),
    [controller, evaluateOrigin],
  );

  const onViewport = useCallback(
    (boardEndY: number, viewportBottom: number, viewportHeight: number) => {
      if (nearEnd(boardEndY, viewportBottom, viewportHeight)) void controller.loadMore();
    },
    [controller],
  );

  return {
    state,
    shownOrigin,
    refreshing,
    filter,
    setFilter,
    refresh,
    retry: controller.load,
    retryPage: controller.retryPage,
    onViewport,
  };
}

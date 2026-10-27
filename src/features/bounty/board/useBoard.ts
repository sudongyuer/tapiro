import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { bountyCache } from '../shared/bountyCache';
import { createBoardController, nearEnd } from './boardState';
import { boardService } from './services';
import type { BoardFilter, BoardOrigin } from './types';

export function useBoard(origin: BoardOrigin | null) {
  const [controller] = useState(() => createBoardController(boardService));
  const [filter, setFilter] = useState<BoardFilter>('all');
  const { state, refreshing } = useSyncExternalStore(controller.subscribe, controller.get);
  const focused = useIsFocused();
  const focusedRef = useRef(focused);

  useEffect(() => {
    focusedRef.current = focused;
  }, [focused]);

  useEffect(() => {
    if (origin) void controller.setQuery(origin, filter);
  }, [controller, origin, filter]);

  useEffect(() => {
    if (focused) void controller.load();
  }, [controller, focused]);

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

  const rows = state.kind === 'ready' ? state.rows : null;
  useEffect(() => {
    if (rows) bountyCache.seed(rows);
  }, [rows]);

  const onViewport = useCallback(
    (boardEndY: number, viewportBottom: number, viewportHeight: number) => {
      if (nearEnd(boardEndY, viewportBottom, viewportHeight)) void controller.loadMore();
    },
    [controller],
  );

  return {
    state,
    refreshing,
    filter,
    setFilter,
    refresh: controller.load,
    retry: controller.load,
    retryPage: controller.retryPage,
    onViewport,
  };
}

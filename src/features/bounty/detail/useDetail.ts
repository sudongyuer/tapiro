import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useReducer, useRef } from 'react';

import { locationService } from '@/lib/location';

import { evaluateOrigin } from '../board/originStore';
import { boardService, originStore } from '../board/services';
import { originPoint } from '../board/types';
import { bountyCache } from '../shared/bountyCache';
import { detailReducer, initialDetail, keptWrite, withWrite, type LocalWrite } from './detailState';

export function useDetail(id: string, userId: string) {
  const [state, dispatch] = useReducer(detailReducer, id, (key) =>
    initialDetail(bountyCache.row(key)),
  );
  const request = useRef(0);
  const write = useRef<LocalWrite | null>(null);
  const gone = state.kind === 'gone';
  const focused = useIsFocused();

  const load = useCallback(async () => {
    const current = ++request.current;
    dispatch({ type: 'started', request: current });
    try {
      const origin = await evaluateOrigin(locationService, {
        chosen: originStore.chosenPlace(userId),
        dismissed: originStore.cardDismissed(userId),
      });
      const answer = await boardService.detail(id, originPoint(origin));
      if (answer === 'gone') {
        bountyCache.drop(id);
        dispatch({ type: 'gone', request: current });
        return;
      }
      if (current !== request.current) return;
      write.current = keptWrite(write.current, current);
      bountyCache.setDetail(withWrite(answer, write.current));
      dispatch({ type: 'loaded', request: current, detail: answer, at: new Date().toISOString() });
    } catch {
      dispatch({ type: 'failed', request: current });
    }
  }, [id, userId]);

  useEffect(() => {
    if (focused && !gone) void load();
  }, [focused, gone, load]);

  useEffect(
    () =>
      bountyCache.onApplicationChange((change) => {
        if (change.id !== id) return;
        write.current = { applied: change.applied, note: change.note, request: request.current };
        dispatch({ type: 'written', applied: change.applied, note: change.note });
      }),
    [id],
  );

  return { state, retry: load };
}

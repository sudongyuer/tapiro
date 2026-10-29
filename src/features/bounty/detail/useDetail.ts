import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useReducer, useRef } from 'react';

import { locationService } from '@/lib/location';

import { detailOrigin, evaluateOrigin } from '../board/originStore';
import { boardService, originStore, shownOrigins } from '../board/services';
import { originPoint } from '../board/types';
import { selectService } from '../select/services';
import { bountyCache } from '../shared/bountyCache';
import { justApplied } from '../shared/justApplied';
import {
  detailReducer,
  hasOutcome,
  initialDetail,
  keptWrite,
  seenMarkDue,
  withWrite,
  type LocalWrite,
} from './detailState';

export function useDetail(id: string, userId: string) {
  const [state, dispatch] = useReducer(detailReducer, id, (key) =>
    initialDetail(bountyCache.row(key)),
  );
  const request = useRef(0);
  const write = useRef<LocalWrite | null>(null);
  const seen = useRef(false);
  const gone = state.kind === 'gone';
  const focused = useIsFocused();

  const load = useCallback(async () => {
    const current = ++request.current;
    dispatch({ type: 'started', request: current });
    try {
      const origin = await detailOrigin(shownOrigins.get(userId), () =>
        evaluateOrigin(locationService, {
          chosen: originStore.chosenPlace(userId),
          dismissed: originStore.cardDismissed(userId),
        }),
      );
      const answer = await boardService.detail(id, originPoint(origin));
      if (answer === 'gone') {
        bountyCache.drop(id);
        justApplied.drop(id);
        dispatch({ type: 'gone', request: current });
        return;
      }
      if (current !== request.current) return;
      const settled = hasOutcome(answer);
      if (settled) justApplied.drop(id);
      write.current = settled ? null : keptWrite(write.current, current);
      bountyCache.setDetail(withWrite(answer, write.current));
      if (!write.current) bountyCache.settleRow(id, answer.myApplication?.status === 'pending');
      dispatch({ type: 'loaded', request: current, detail: answer, at: new Date().toISOString() });
      if (seenMarkDue(answer) && !seen.current) {
        seen.current = true;
        void selectService.markNotSelectedSeen(id);
      }
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
        if (change.id !== id || change.fromServer) return;
        if (!change.applied) justApplied.drop(id);
        write.current = { applied: change.applied, note: change.note, request: request.current };
        dispatch({ type: 'written', applied: change.applied, note: change.note });
      }),
    [id],
  );

  return { state, retry: load };
}

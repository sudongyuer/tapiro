import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useReducer, useRef } from 'react';

import { useFreshness } from '../board/useFreshness';
import { statusService } from './services';
import {
  actionLocked,
  INITIAL_STATUS,
  statusReducer,
  type ActionId,
  type StatusState,
} from './statusState';
import type { ActionResult } from './types';

export function useStatus(bountyId: string) {
  const [state, dispatch] = useReducer(statusReducer, INITIAL_STATUS);
  const request = useRef(0);
  const sending = useRef(false);
  const latest = useRef<StatusState>(state);
  const focused = useIsFocused();

  useEffect(() => {
    latest.current = state;
  }, [state]);

  const load = useCallback(async () => {
    const current = ++request.current;
    dispatch({ type: 'loadStarted', request: current });
    try {
      const answer = await statusService.detail(bountyId);
      if (answer === 'unavailable') dispatch({ type: 'unavailable', request: current });
      else {
        dispatch({
          type: 'loaded',
          request: current,
          detail: answer,
          at: new Date().toISOString(),
        });
      }
    } catch {
      dispatch({ type: 'loadFailed', request: current });
    }
  }, [bountyId]);

  useEffect(() => {
    if (focused) void load();
  }, [focused, load]);

  useFreshness(load);

  const act = useCallback(
    async <T>(action: ActionId, call: () => Promise<ActionResult<T>>) => {
      const now = latest.current;
      if (sending.current || now.load.kind !== 'ready' || actionLocked(now.action)) return null;
      sending.current = true;
      dispatch({ type: 'actionStarted', action });
      try {
        const result = await call().catch((): ActionResult<T> => ({ ok: false, reason: 'failed' }));
        dispatch({
          type: 'actionAnswered',
          action,
          outcome: result.ok ? { ok: true } : { ok: false, reason: result.reason },
        });
        if (result.ok || result.reason === 'changed') void load();
        return result;
      } finally {
        sending.current = false;
      }
    },
    [load],
  );

  const dismissNotice = useCallback(() => dispatch({ type: 'noticeDismissed' }), []);

  return { state, refresh: load, act, dismissNotice };
}

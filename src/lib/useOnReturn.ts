import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

const BLUR_WITHIN_MS = 1000;

// A screen another screen was presented over (a sheet over a sheet) loses focus until that one closes; the stack's
// focus, not visibility, tells the screen under it that the user came back. Only a blur soon after leaving counts, so
// a leave that never navigated cannot fire on some later, unrelated return.
export function useOnReturn(onReturn: () => void) {
  const leftAt = useRef(0);
  const away = useRef(false);
  const latest = useRef(onReturn);
  useEffect(() => {
    latest.current = onReturn;
  });
  useFocusEffect(
    useCallback(() => {
      if (away.current) {
        away.current = false;
        latest.current();
      }
      return () => {
        away.current = Date.now() - leftAt.current < BLUR_WITHIN_MS;
      };
    }, []),
  );
  return useCallback(
    <A extends unknown[]>(leave: (...args: A) => void) =>
      (...args: A) => {
        leftAt.current = Date.now();
        leave(...args);
      },
    [],
  );
}

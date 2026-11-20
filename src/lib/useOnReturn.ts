import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

// A screen another screen was presented over (a sheet over a sheet) loses focus until that one closes; the stack's
// focus, not visibility, is what tells the screen under it that the user came back.
export function useOnReturn(onReturn: () => void) {
  const away = useRef(false);
  const latest = useRef(onReturn);
  useEffect(() => {
    latest.current = onReturn;
  });
  useFocusEffect(
    useCallback(() => {
      if (!away.current) return;
      away.current = false;
      latest.current();
    }, []),
  );
  return useCallback(
    (leave: () => void) => () => {
      away.current = true;
      leave();
    },
    [],
  );
}

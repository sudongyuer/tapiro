import { useIsFocused } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

export function useBoardTick(tick: () => void, everyMs: number | null) {
  const focused = useIsFocused();
  useEffect(() => {
    if (!focused || everyMs === null) return;
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') tick();
    }, everyMs);
    return () => clearInterval(timer);
  }, [focused, tick, everyMs]);
}

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { live } from './instance';
import type { LiveHandler } from './types';

export function useLive(userId: string | null) {
  useEffect(() => {
    live.follow(userId);
    if (!userId) return;
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') live.foreground();
    });
    return () => subscription.remove();
  }, [userId]);
  useEffect(() => () => live.stop(), []);
}

export function useLiveSignal(prefixes: readonly string[], handler: LiveHandler, enabled = true) {
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  });
  const key = prefixes.join('|');
  useEffect(() => {
    if (!enabled) return;
    return live.on(key.split('|'), (signal) => latest.current(signal));
  }, [key, enabled]);
}

export function useLiveOffline() {
  return useSyncExternalStore(live.offline.subscribe, live.offline.get);
}

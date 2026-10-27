import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { locationService } from '@/lib/location';

import { sameOrigin } from './boardState';
import { resolveOrigin, steadyOrigin, type ChosenPlace } from './originStore';
import { originStore } from './services';
import type { BoardOrigin } from './types';

export function useOrigin(userId: string) {
  const [resolved, setResolved] = useState<{ userId: string; origin: BoardOrigin } | null>(null);
  const origin = resolved?.userId === userId ? resolved.origin : null;
  const sequence = useRef(0);
  const focused = useIsFocused();

  const evaluate = useCallback(async () => {
    const run = ++sequence.current;
    const stored = {
      chosen: originStore.chosenPlace(userId),
      dismissed: originStore.cardDismissed(userId),
    };
    let next: BoardOrigin;
    try {
      const { status } = await locationService.permission();
      const point = status === 'granted' ? await locationService.currentPoint() : null;
      next = resolveOrigin({ permission: status, point, ...stored });
    } catch {
      next = resolveOrigin({ permission: 'granted', point: null, ...stored });
    }
    if (run !== sequence.current) return;
    setResolved((current) => {
      const previous = current?.userId === userId ? current.origin : null;
      const steady = steadyOrigin(previous, next);
      return previous && sameOrigin(previous, steady) ? current : { userId, origin: steady };
    });
  }, [userId]);

  useEffect(() => {
    if (focused) void evaluate();
  }, [focused, evaluate]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void evaluate();
    });
    return () => subscription.remove();
  }, [evaluate]);

  const allow = useCallback(async () => {
    await locationService.request();
    await evaluate();
  }, [evaluate]);

  const dismiss = useCallback(() => {
    originStore.dismissCard(userId);
    void evaluate();
  }, [userId, evaluate]);

  const choose = useCallback(
    (place: ChosenPlace) => {
      originStore.setChosenPlace(userId, place);
      void evaluate();
    },
    [userId, evaluate],
  );

  return { origin, allow, dismiss, choose };
}

import { useCallback, useEffect, useRef, useState } from 'react';

import { locationService } from '@/lib/location';

import { sameOrigin } from './boardState';
import { evaluateOrigin, requestLocation, steadyOrigin, type ChosenPlace } from './originStore';
import { originStore } from './services';
import type { BoardOrigin } from './types';
import { useFreshness } from './useFreshness';

type Resolved = { userId: string; origin: BoardOrigin };

export function useOrigin(userId: string) {
  const [resolved, setResolved] = useState<Resolved | null>(null);
  const origin = resolved?.userId === userId ? resolved.origin : null;
  const latest = useRef<Resolved | null>(null);
  const sequence = useRef(0);
  const evaluate = useCallback(async (): Promise<BoardOrigin | null> => {
    const run = ++sequence.current;
    const next = await evaluateOrigin(locationService, {
      chosen: originStore.chosenPlace(userId),
      dismissed: originStore.cardDismissed(userId),
    });
    const current = latest.current?.userId === userId ? latest.current.origin : null;
    if (run !== sequence.current) return current;
    const steady = steadyOrigin(current, next);
    if (current && sameOrigin(current, steady)) return current;
    latest.current = { userId, origin: steady };
    setResolved(latest.current);
    return steady;
  }, [userId]);

  useEffect(() => {
    void evaluate();
  }, [evaluate]);

  useFreshness(evaluate);

  const allow = useCallback(async () => {
    await requestLocation(locationService);
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

  return { origin, evaluate, allow, dismiss, choose };
}

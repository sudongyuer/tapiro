import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cancelAnimation, Easing, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { FEED_MS, FLIGHT_END } from './feedMotion';

export function useFeedMotion() {
  const progress = useSharedValue(1);
  const [flying, setFlying] = useState(false);
  const arrival = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDone = useRef<(() => void) | null>(null);

  const arrive = useCallback(() => {
    if (!arrival.current) return;
    clearTimeout(arrival.current);
    arrival.current = null;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  }, []);

  const end = useCallback(() => {
    arrive();
    setFlying(false);
    const done = onDone.current;
    onDone.current = null;
    done?.();
  }, [arrive]);

  useEffect(
    () => () => {
      if (arrival.current) clearTimeout(arrival.current);
    },
    [],
  );

  return {
    progress,
    flying,
    hold: useCallback(() => {
      progress.set(0);
    }, [progress]),
    release: useCallback(() => {
      progress.set(1);
    }, [progress]),
    play: useCallback(
      (done: () => void) => {
        onDone.current = done;
        setFlying(true);
        arrival.current = setTimeout(arrive, FEED_MS * FLIGHT_END);
        progress.set(
          withTiming(1, { duration: FEED_MS, easing: Easing.linear }, (finished) => {
            if (finished) scheduleOnRN(end);
          }),
        );
      },
      [arrive, end, progress],
    ),
    skip: useCallback(() => {
      if (!onDone.current) return;
      cancelAnimation(progress);
      progress.set(1);
      end();
    }, [end, progress]),
  };
}

export type FeedMotion = ReturnType<typeof useFeedMotion>;

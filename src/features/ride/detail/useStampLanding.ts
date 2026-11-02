import * as Haptics from 'expo-haptics';
import { useLayoutEffect, useRef } from 'react';
import {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { vars } from '@/ui/theme/tokens';

const FROM = 1.4;
const NEVER = ReduceMotion.Never;
const SPRING = { damping: 14, stiffness: 220, reduceMotion: NEVER } as const;

function landed() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}

export function useStampLanding(shown: boolean, tilt: number) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(shown ? 1 : 0);
  const before = useRef(shown);

  useLayoutEffect(() => {
    const was = before.current;
    before.current = shown;
    if (!shown) {
      opacity.set(0);
      scale.set(1);
      return;
    }
    if (was) return;
    if (reduceMotion) {
      scale.set(1);
      opacity.set(
        withTiming(1, { duration: vars['--duration-fade'], reduceMotion: NEVER }, (done) => {
          if (done) scheduleOnRN(landed);
        }),
      );
      return;
    }
    opacity.set(1);
    scale.set(FROM);
    scale.set(
      withSpring(1, SPRING, (done) => {
        if (done) scheduleOnRN(landed);
      }),
    );
  }, [shown, reduceMotion, opacity, scale]);

  return useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ rotate: `${tilt}deg` }, { scale: scale.get() }],
  }));
}

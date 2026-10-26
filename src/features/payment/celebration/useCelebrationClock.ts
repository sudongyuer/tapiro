import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import {
  cancelAnimation,
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { REDUCED_FADE, TIMELINE, TOTAL } from './timeline';

export type Clock = SharedValue<number>;

function landed() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}

export function useCelebrationClock(ready: boolean, announcement: string) {
  const reduceMotion = useReducedMotion();
  const clock = useSharedValue(0);
  const fade = useSharedValue(reduceMotion ? 0 : 1);

  const [buttonsLive, setButtonsLive] = useState(false);

  useEffect(() => {
    if (ready) AccessibilityInfo.announceForAccessibility(announcement);
  }, [ready, announcement]);

  useEffect(() => {
    if (!ready) return;
    if (reduceMotion) {
      clock.set(TOTAL);
      fade.set(
        withTiming(1, { duration: REDUCED_FADE }, (finished) => {
          if (finished) scheduleOnRN(setButtonsLive, true);
        }),
      );
      return;
    }
    clock.set(withTiming(TOTAL, { duration: TOTAL, easing: Easing.linear }));
    return () => cancelAnimation(clock);
  }, [ready, reduceMotion, clock, fade]);

  useAnimatedReaction(
    () => clock.value >= TIMELINE.land,
    (now, before) => {
      if (now && before !== true) scheduleOnRN(landed);
    },
  );

  useAnimatedReaction(
    () => !reduceMotion && clock.value >= TIMELINE.buttons.start,
    (now, before) => {
      if (now && before !== true) scheduleOnRN(setButtonsLive, true);
    },
  );

  const skip = useCallback(() => {
    cancelAnimation(clock);
    clock.set(TOTAL);
    cancelAnimation(fade);
    fade.set(1);
    setButtonsLive(true);
  }, [clock, fade]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  return { clock, skip, fadeStyle, reduceMotion, buttonsLive };
}

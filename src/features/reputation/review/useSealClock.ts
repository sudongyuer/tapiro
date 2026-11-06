import * as Haptics from 'expo-haptics';
import { useCallback, useEffect } from 'react';
import {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedReaction,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { uiVerifyReduceMotion } from '@/lib/uiVerify';
import { vars } from '@/ui/theme/tokens';

import { SEAL, SEAL_PRESS_FROM, SEAL_PRESS_SPRING } from './sealTimeline';

export type SealClock = {
  clock: SharedValue<number>;
  fade: SharedValue<number>;
  press: SharedValue<number>;
  reduced: boolean;
  skip: () => void;
};

function pressed() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

export function useSealClock(running: boolean, moves: boolean): SealClock {
  const reduced = useReducedMotion() || uiVerifyReduceMotion || !moves;
  const clock = useSharedValue(0);
  const fade = useSharedValue(0);
  const press = useSharedValue<number>(SEAL_PRESS_FROM);
  const skipped = useSharedValue(false);

  useEffect(() => {
    if (!running) return;
    if (reduced) {
      clock.set(SEAL.total);
      press.set(1);
      pressed();
      fade.set(
        withTiming(1, { duration: vars['--duration-fade'], reduceMotion: ReduceMotion.Never }),
      );
      return () => cancelAnimation(fade);
    }
    clock.set(withTiming(SEAL.total, { duration: SEAL.total, easing: Easing.linear }));
    return () => cancelAnimation(clock);
  }, [running, reduced, clock, fade, press]);

  useAnimatedReaction(
    () => !reduced && clock.value >= SEAL.press,
    (now, before) => {
      if (!now || before !== false) return;
      scheduleOnRN(pressed);
      press.set(skipped.value ? 1 : withSpring(1, SEAL_PRESS_SPRING));
    },
  );

  const skip = useCallback(() => {
    skipped.set(true);
    cancelAnimation(clock);
    clock.set(SEAL.total);
    cancelAnimation(fade);
    fade.set(1);
    cancelAnimation(press);
    press.set(1);
  }, [clock, fade, press, skipped]);

  return { clock, fade, press, reduced, skip };
}

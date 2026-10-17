import { useEffect } from 'react';
import {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { vars } from '@/ui/theme/tokens';

import type { Drift } from './welcomeLayout';
import { BREATH_CYCLES, DRIFT_CYCLES, POP_DURATION } from './welcomeTiming';

export const PANEL_DELAY = 900;
const POP = { duration: POP_DURATION, dampingRatio: 0.55 } as const;
const FADE = { duration: vars['--duration-fade'] } as const;
const BREATH = 1600;
const HOP_UP = { duration: 180, dampingRatio: 0.7 } as const;
const HOP_DOWN = { duration: 360, dampingRatio: 0.45 } as const;
const loop = Easing.inOut(Easing.sin);

export function usePop(delay: number, drift?: Drift) {
  const reduceMotion = useReducedMotion();
  const pop = useSharedValue(0);
  const float = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(float);
      float.set(0);
      pop.set(withTiming(1, FADE));
      return;
    }
    pop.set(withDelay(delay, withSpring(1, POP)));
    if (drift) {
      float.set(
        withDelay(
          delay + POP_DURATION,
          withRepeat(
            withTiming(1, { duration: drift.period / 2, easing: loop }),
            DRIFT_CYCLES * 2,
            true,
          ),
        ),
      );
    }
  }, [reduceMotion, delay, drift, pop, float]);
  return useAnimatedStyle(() => {
    if (reduceMotion) return { opacity: pop.value };
    const p = pop.value;
    const f = float.value;
    return {
      opacity: interpolate(p, [0, 0.5], [0, 1], Extrapolation.CLAMP),
      transform: [
        { translateX: (drift?.x ?? 0) * f },
        { translateY: (drift?.y ?? 0) * f },
        { rotate: `${-10 * (1 - p) + (drift?.rotate ?? 0) * f}deg` },
        { scale: 0.6 + 0.4 * p },
      ],
    };
  });
}

export function useBreath(delay: number) {
  const reduceMotion = useReducedMotion();
  const breath = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(breath);
      breath.set(0);
      return;
    }
    breath.set(
      withDelay(
        delay + POP_DURATION,
        withRepeat(withTiming(1, { duration: BREATH / 2, easing: loop }), BREATH_CYCLES * 2, true),
      ),
    );
  }, [reduceMotion, delay, breath]);
  return useAnimatedStyle(() => ({
    transform: [{ rotate: '-4deg' }, { scale: 1 + 0.03 * breath.value }],
  }));
}

export function useHop() {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  function hop() {
    if (reduceMotion) return;
    scale.set(withSequence(withSpring(1.18, HOP_UP), withSpring(1, HOP_DOWN)));
  }
  return { style, hop };
}

export function useRise() {
  const reduceMotion = useReducedMotion();
  const rise = useSharedValue(reduceMotion ? 0 : 1);
  const height = useSharedValue(0);
  const fade = useSharedValue(reduceMotion ? 0 : 1);
  useEffect(() => {
    if (reduceMotion) {
      rise.set(0);
      fade.set(withTiming(1, FADE));
      return;
    }
    fade.set(1);
    rise.set(withDelay(PANEL_DELAY, withSpring(0, { duration: 600, dampingRatio: 0.72 })));
  }, [reduceMotion, rise, fade]);
  const style = useAnimatedStyle(() => ({
    opacity: height.value > 0 ? fade.value : 0,
    transform: [{ translateY: rise.value * height.value }],
  }));
  return { style, height };
}

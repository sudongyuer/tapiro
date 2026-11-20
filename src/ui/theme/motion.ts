import { Easing, FadeIn, FadeOut, ReduceMotion, useReducedMotion } from 'react-native-reanimated';

import { uiVerifyReduceMotion } from '@/lib/uiVerify';

import { vars } from './tokens';

export const EASE_ENTER = Easing.bezier(0.23, 1, 0.32, 1);
export const EASE_MOVE = Easing.bezier(0.77, 0, 0.175, 1);

export const EASE_ENTER_FN = Easing.bezierFn(0.23, 1, 0.32, 1);
export const EASE_MOVE_FN = Easing.bezierFn(0.77, 0, 0.175, 1);

export const FADE_IN = FadeIn.duration(vars['--duration-fade'])
  .easing(EASE_ENTER)
  .reduceMotion(ReduceMotion.Never);
export const FADE_OUT = FadeOut.duration(vars['--duration-fade'])
  .easing(EASE_ENTER)
  .reduceMotion(ReduceMotion.Never);

export function useMotionReduced() {
  return useReducedMotion() || uiVerifyReduceMotion;
}

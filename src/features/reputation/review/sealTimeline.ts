import { Easing } from 'react-native-reanimated';

export const SEAL = {
  total: 750,
  form: { start: 0, end: 150 },
  faceMove: { start: 0, end: 320 },
  faceFade: { start: 320, end: 440 },
  envelope: { start: 80, end: 280 },
  flap: { start: 320, end: 520 },
  press: 520,
  pressFade: { start: 520, end: 600 },
  copy: { start: 600, end: 750 },
} as const;

export const SEAL_FACE_SCALE = 0.55;
export const SEAL_ENVELOPE_RISE = 24;
export const SEAL_PRESS_FROM = 1.12;
export const SEAL_PRESS_SPRING = { duration: 240, dampingRatio: 0.7 } as const;

export const easeMove = Easing.bezierFn(0.77, 0, 0.175, 1);
export const easeEnter = Easing.bezierFn(0.23, 1, 0.32, 1);

export function progress(clock: number, span: { start: number; end: number }) {
  'worklet';
  return Math.min(1, Math.max(0, (clock - span.start) / (span.end - span.start)));
}

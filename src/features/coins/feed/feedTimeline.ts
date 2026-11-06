import { Easing } from 'react-native-reanimated';

export const LEAF = {
  drop: 420,
  fadeIn: 100,
  swayAt: 0.55,
  from: -110,
  swayFrom: -18,
  swayTo: 14,
  eat: 180,
  eatScale: 0.4,
  eatX: -4,
  eatY: 2,
  fall: 240,
  fallX: -10,
  fallY: 46,
  fallTurn: 40,
} as const;

export const BITE = { step: 90, scaleY: 0.94, scaleX: 1.03 } as const;
export const FEED_BUBBLE = { rise: 6, duration: 200 } as const;
export const ANSWER_HOLD_MS = 4000;

export const easeEnter = Easing.bezierFn(0.23, 1, 0.32, 1);
export const easeMove = Easing.bezier(0.77, 0, 0.175, 1);
export const enterCurve = Easing.bezier(0.23, 1, 0.32, 1);

export function leafDrop(clock: number) {
  'worklet';
  const eased = easeEnter(clock);
  const sway =
    clock < LEAF.swayAt
      ? LEAF.swayFrom + (LEAF.swayTo - LEAF.swayFrom) * easeEnter(clock / LEAF.swayAt)
      : LEAF.swayTo * (1 - easeEnter((clock - LEAF.swayAt) / (1 - LEAF.swayAt)));
  return {
    opacity: Math.min(1, (clock * LEAF.drop) / LEAF.fadeIn),
    y: LEAF.from * (1 - eased),
    turn: sway,
  };
}

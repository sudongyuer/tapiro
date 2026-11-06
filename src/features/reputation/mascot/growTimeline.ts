export const GROW = {
  total: 760,
  crouch: { start: 0, end: 140 },
  wear: { start: 140, end: 290 },
  bubble: { start: 560, end: 760 },
} as const;

export const GROW_REDUCED = {
  total: 300,
  wear: { start: 0, end: 150 },
  bubble: { start: 150, end: 300 },
} as const;

export const GROW_CROUCH = { x: 0.93, y: 0.81 } as const;
export const GROW_WEAR_FROM = 0.95;
export const GROW_BUBBLE_RISE = 6;
export const GROW_SPRING = { duration: 420, dampingRatio: 0.55 } as const;

export function growScale(crouched: number, grown: number, low: number) {
  'worklet';
  return 1 + (low - 1) * crouched + (1 - low) * grown;
}

export type GrowStep = 'hold' | 'play' | 'finish' | 'rest';

export function growStep({
  levelUp,
  level,
  played,
  visible,
}: {
  levelUp: boolean;
  level: number;
  played: number;
  visible: boolean;
}): GrowStep {
  if (levelUp && level > played) return visible ? 'play' : 'hold';
  return visible ? 'rest' : 'finish';
}

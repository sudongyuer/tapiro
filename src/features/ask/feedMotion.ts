import { BELLY_SEGMENTS } from './belly';

export const FEED_MS = 800;
export const FLIGHT_END = 0.5;
export const LEAF_LIFT = 28;
const SEGMENT_SPAN = (1 - FLIGHT_END) / BELLY_SEGMENTS;

export type Point = { x: number; y: number };

const clamp01 = (value: number) => {
  'worklet';
  return Math.min(1, Math.max(0, value));
};

const easeInOut = (t: number) => {
  'worklet';
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
};

export function leafAt(progress: number, from: Point, to: Point) {
  'worklet';
  const t = easeInOut(clamp01(progress / FLIGHT_END));
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t - Math.sin(Math.PI * t) * LEAF_LIFT,
    scale: 1 - 0.4 * t,
    opacity: progress >= FLIGHT_END ? 0 : 1,
  };
}

export function segmentLevel(progress: number, index: number) {
  'worklet';
  const start = FLIGHT_END + index * SEGMENT_SPAN;
  const t = clamp01((progress - start) / SEGMENT_SPAN);
  return 1 - (1 - t) * (1 - t);
}

export type Curve = readonly [number, number, number, number] | 'linear';

export const EASE_OUT: Curve = [0, 0, 0.58, 1];

export const TIMELINE = {
  curl: { start: 300, duration: 420, curve: [0.3, 0, 0.4, 1] },
  book: { start: 260, duration: 700, curve: [0.22, 1.2, 0.36, 1] },
  lift: { start: 380, duration: 300, curve: [0.2, 0.8, 0.3, 1.3] },
  shift: { start: 460, duration: 220, curve: [0.2, 0.8, 0.3, 1] },
  receipt: { start: 460, duration: 520, curve: [0.5, 0, 0.8, 0.45] },
  flyX: { start: 500, duration: 520, curve: [0.25, 0.6, 0.35, 1] },
  converge: { start: 500, duration: 520, curve: [0.25, 0.6, 0.35, 1] },
  flyY: { start: 500, duration: 520, curve: [0.55, 0, 0.75, 0.6] },
  flyScale: { start: 500, duration: 1000 },
  tapirIn: { start: 680, duration: 620, curve: [0.3, 1.4, 0.5, 1] },
  land: 1020,
  glow: { start: 1020, duration: 900 },
  fill: { start: 1020, duration: 200 },
  confetti: { start: 1020, duration: 1100, stagger: 8 },
  bump: { start: 1020, duration: 520 },
  hop: { start: 1020, duration: 760 },
  nod: { start: 1020, duration: 520 },
  blush: { start: 1040, duration: 700 },
  badge: { start: 1160, duration: 640, curve: [0.2, 0.9, 0.3, 1.45] },
  count: { start: 1160, duration: 500, curve: [0.2, 0.9, 0.3, 1.3] },
  headline: { start: 780, duration: 460, curve: [0.23, 1, 0.32, 1] },
  digits: { start: 800, step: 70, duration: 1000, curve: [0.2, 0.9, 0.25, 1.12] },
  title: { start: 1060, duration: 420, curve: [0.23, 1, 0.32, 1] },
  buttons: { start: 1400, duration: 360, curve: [0.23, 1, 0.32, 1] },
  stickerShine: { start: 1500, duration: 720, curve: [0.45, 0, 0.25, 1] },
  amountShine: { start: 1650, duration: 900, curve: [0.45, 0, 0.25, 1] },
} as const;

export const TOTAL = 2600;
export const REDUCED_FADE = 360;

function bezier(x1: number, y1: number, x2: number, y2: number, x: number) {
  'worklet';
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  let u = x;
  for (let i = 0; i < 8; i++) {
    const error = ((ax * u + bx) * u + cx) * u - x;
    const slope = (3 * ax * u + 2 * bx) * u + cx;
    if (Math.abs(error) < 1e-6) break;
    if (Math.abs(slope) < 1e-6) break;
    u -= error / slope;
  }
  if (u < 0 || u > 1 || Math.abs(((ax * u + bx) * u + cx) * u - x) > 1e-4) {
    let low = 0;
    let high = 1;
    u = x;
    for (let i = 0; i < 30; i++) {
      const value = ((ax * u + bx) * u + cx) * u;
      if (Math.abs(value - x) < 1e-6) break;
      if (value < x) low = u;
      else high = u;
      u = (low + high) / 2;
    }
  }
  return ((ay * u + by) * u + cy) * u;
}

export function ease(curve: Curve, x: number) {
  'worklet';
  if (curve === 'linear' || x <= 0 || x >= 1) return x;
  return bezier(curve[0], curve[1], curve[2], curve[3], x);
}

export function keyframes(
  t: number,
  start: number,
  duration: number,
  stops: readonly number[],
  values: readonly number[],
  curves: Curve | readonly Curve[] = 'linear',
) {
  'worklet';
  const p = Math.min(1, Math.max(0, (t - start) / duration));
  if (p <= stops[0]) return values[0];
  for (let i = 1; i < stops.length; i++) {
    if (p <= stops[i]) {
      const span = stops[i] - stops[i - 1];
      const local = span > 0 ? (p - stops[i - 1]) / span : 1;
      const curve =
        typeof curves === 'string' || typeof curves[0] === 'number'
          ? (curves as Curve)
          : (curves as readonly Curve[])[i - 1];
      return values[i - 1] + (values[i] - values[i - 1]) * ease(curve, local);
    }
  }
  return values[values.length - 1];
}

export function tween(
  t: number,
  segment: { start: number; duration: number; curve?: Curve },
  from: number,
  to: number,
) {
  'worklet';
  return keyframes(
    t,
    segment.start,
    segment.duration,
    [0, 1],
    [from, to],
    segment.curve ?? 'linear',
  );
}

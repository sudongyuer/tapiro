export const TURN_DISTANCE = 0.3;
export const TURN_VELOCITY = 800;
export const TILT_DEGREES = 10;
export const WINDOW = 3;
const RUBBER = 0.55;

export type Turn = -1 | 0 | 1;

export function releaseTurn(
  translation: number,
  velocity: number,
  width: number,
  count: number,
  index: number,
): Turn {
  'worklet';
  const flung =
    Math.abs(velocity) > TURN_VELOCITY && Math.sign(velocity) === Math.sign(translation);
  const far = Math.abs(translation) > width * TURN_DISTANCE;
  if (!flung && !far) return 0;
  const turn: Turn = translation < 0 ? 1 : -1;
  const next = index + turn;
  return next >= 0 && next < count ? turn : 0;
}

export function rubberBand(translation: number, width: number) {
  'worklet';
  const limit = width * TURN_DISTANCE;
  const pulled = Math.abs(translation);
  return Math.sign(translation) * (1 - 1 / ((pulled * RUBBER) / limit + 1)) * limit;
}

export function dragPosition(
  base: number,
  translation: number,
  width: number,
  count: number,
): number {
  'worklet';
  const toward = translation < 0 ? 1 : -1;
  const next = base + toward;
  const blocked = translation !== 0 && (next < 0 || next >= count);
  const travel = blocked ? rubberBand(translation, width) : translation;
  return base - travel / width;
}

export type CardPose = {
  translateX: number;
  translateY: number;
  rotate: number;
  scale: number;
  opacity: number;
};

const LAYERS = [
  { translateX: 0, translateY: 0, rotate: 0, scale: 1 },
  { translateX: -8, translateY: 10, rotate: -5, scale: 0.97 },
  { translateX: 7, translateY: 18, rotate: 4, scale: 0.94 },
];

function mix(a: number, b: number, t: number) {
  'worklet';
  return a + (b - a) * t;
}

function layerPose(depth: number): CardPose {
  'worklet';
  const clamped = Math.min(Math.max(depth, 0), LAYERS.length - 1);
  const low = Math.floor(clamped);
  const high = Math.min(low + 1, LAYERS.length - 1);
  const t = clamped - low;
  return {
    translateX: mix(LAYERS[low].translateX, LAYERS[high].translateX, t),
    translateY: mix(LAYERS[low].translateY, LAYERS[high].translateY, t),
    rotate: mix(LAYERS[low].rotate, LAYERS[high].rotate, t),
    scale: mix(LAYERS[low].scale, LAYERS[high].scale, t),
    opacity: Math.min(1, Math.max(0, LAYERS.length - depth)),
  };
}

export function cardPose(card: number, position: number, base: number, width: number): CardPose {
  'worklet';
  const towardOlder = position >= base;
  const rel = card - position;
  const leaving = towardOlder ? rel <= 0 : rel >= 0;
  if (leaving) {
    const away = Math.abs(rel);
    return {
      translateX: rel * width,
      translateY: 0,
      rotate: rel * TILT_DEGREES,
      scale: 1,
      opacity: away >= 1.5 ? 0 : 1,
    };
  }
  return layerPose(Math.abs(rel));
}

export function cardWindow(index: number, count: number, towardNewer: boolean): number[] {
  const cards: number[] = [];
  for (let card = index - WINDOW; card <= index + WINDOW; card++) {
    if (card >= 0 && card < count) cards.push(card);
  }
  return towardNewer ? cards : cards.reverse();
}

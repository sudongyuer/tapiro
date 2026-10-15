import type { ObjectKind } from '@/ui/objectKinds';

export const DESIGN_WIDTH = 390;
export const SHORT_SCREEN_HEIGHT = 700;
export const SHORT_LIFT = 72;
export const MASCOT_SIZE = 170;
export const POP_STAGGER = 70;
export const HERO_TEXT_HEIGHT = 96;

const STICKER_ASPECT = 80 / 96;
const DROPPED_ON_SHORT: readonly ObjectKind[] = ['car', 'boba'];

export type Drift = { x: number; y: number; rotate: number; period: number };

const DRIFTS = {
  a: { x: 0, y: -7, rotate: 1.5, period: 6400 },
  b: { x: 4, y: 5, rotate: -1.5, period: 7800 },
  c: { x: -3, y: -5, rotate: 1, period: 6000 },
} as const satisfies Record<string, Drift>;

type StickerSpec = {
  kind: ObjectKind;
  left: number;
  top: number;
  width: number;
  rotate: number;
  drift: Drift;
};

const STICKERS: readonly StickerSpec[] = [
  { kind: 'parcel', left: 22, top: 92, width: 92, rotate: -14, drift: DRIFTS.a },
  { kind: 'coffee', left: 278, top: 112, width: 76, rotate: 12, drift: DRIFTS.b },
  { kind: 'ticket', left: 30, top: 300, width: 64, rotate: 9, drift: DRIFTS.c },
  { kind: 'books', left: 286, top: 300, width: 80, rotate: -7, drift: DRIFTS.a },
  { kind: 'umbrella', left: 152, top: 60, width: 60, rotate: 16, drift: DRIFTS.b },
  { kind: 'car', left: 258, top: 470, width: 84, rotate: -6, drift: DRIFTS.c },
  { kind: 'boba', left: 40, top: 452, width: 62, rotate: 8, drift: DRIFTS.b },
];

export type PlacedSticker = {
  kind: ObjectKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotate: number;
  drift: Drift;
  delay: number;
};

export type WelcomeLayout = {
  short: boolean;
  stickers: PlacedSticker[];
  mascotTop: number;
  bubble: { x: number; y: number };
  wordmarkTop: number;
};

export function welcomeLayout({ width, height }: { width: number; height: number }) {
  const short = height < SHORT_SCREEN_HEIGHT;
  const scale = width / DESIGN_WIDTH;
  const lift = short ? SHORT_LIFT : 0;
  const stickers = STICKERS.filter((spec) => !short || !DROPPED_ON_SHORT.includes(spec.kind)).map(
    (spec, index): PlacedSticker => ({
      kind: spec.kind,
      x: spec.left * scale,
      y: spec.top,
      width: spec.width,
      height: spec.width * STICKER_ASPECT,
      rotate: spec.rotate,
      drift: spec.drift,
      delay: index * POP_STAGGER,
    }),
  );
  return {
    short,
    stickers,
    mascotTop: 168 - lift,
    bubble: { x: 228 * scale, y: 318 - lift },
    wordmarkTop: 368 - lift,
  } satisfies WelcomeLayout;
}

export function heroBottom(layout: WelcomeLayout) {
  return Math.max(
    ...layout.stickers.map((sticker) => sticker.y + sticker.height),
    layout.mascotTop + MASCOT_SIZE,
    layout.wordmarkTop + HERO_TEXT_HEIGHT,
  );
}

export function stickerExampleKey(kind: ObjectKind) {
  return `account.welcome.examples.${kind}` as const;
}

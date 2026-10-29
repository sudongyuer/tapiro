import { formatMoney, type Money } from '@/lib/money';
import type { ObjectKind } from '@/ui/objectKinds';
import { vars } from '@/ui/theme/tokens';

export const DESIGN_WIDTH = 390;
export const SHORT_SCREEN_HEIGHT = 700;
export const SHORT_LIFT = 72;
export const MASCOT_SIZE = 170;
export const POP_STAGGER = 70;
export const HERO_TEXT_HEIGHT = 104;
export const PANEL_MARGIN = 16;

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
  mascotSize: number;
  bubble: { x: number; y: number; maxRight: number };
  wordmarkTop: number;
  floor: number;
};

export type WelcomeFrame = {
  width: number;
  height: number;
  panelHeight: number;
  topInset: number;
};

const MASCOT_TOP = 168;
const BUBBLE_BELOW_MASCOT_TOP = 150;
const WORDMARK_BELOW_MASCOT = 30;
const MIN_WORDMARK_GAP = vars['--space-1'];
const WORDMARK_TOP = MASCOT_TOP + MASCOT_SIZE + WORDMARK_BELOW_MASCOT;

function place(spec: StickerSpec, scale: number, index: number): PlacedSticker {
  return {
    kind: spec.kind,
    x: spec.left * scale,
    y: spec.top,
    width: spec.width,
    height: spec.width * STICKER_ASPECT,
    rotate: spec.rotate,
    drift: spec.drift,
    delay: index * POP_STAGGER,
  };
}

export function welcomeLayout({ width, height, panelHeight, topInset }: WelcomeFrame) {
  const scale = width / DESIGN_WIDTH;
  const floor = height - panelHeight - PANEL_MARGIN;
  const lowFits = STICKERS.filter((spec) => DROPPED_ON_SHORT.includes(spec.kind)).every(
    (spec) => spec.top + spec.width * STICKER_ASPECT <= floor,
  );
  const short = height < SHORT_SCREEN_HEIGHT || !lowFits;
  const wordmarkTop = Math.min(WORDMARK_TOP - (short ? SHORT_LIFT : 0), floor - HERO_TEXT_HEIGHT);
  const room = wordmarkTop - (topInset + vars['--space-2']);
  const gap = Math.min(WORDMARK_BELOW_MASCOT, Math.max(MIN_WORDMARK_GAP, room - MASCOT_SIZE));
  const mascotSize = Math.max(0, Math.min(MASCOT_SIZE, room - gap));
  const mascotTop = wordmarkTop - gap - mascotSize;
  const kept = STICKERS.filter((spec) => {
    if (short && DROPPED_ON_SHORT.includes(spec.kind)) return false;
    if (spec.kind === 'umbrella') return spec.top + spec.width * STICKER_ASPECT <= mascotTop;
    return true;
  });
  const stickers = kept.map((spec, index) => {
    const placed = place(spec, scale, index);
    return { ...placed, y: Math.min(placed.y, floor - placed.height) };
  });
  const books = stickers.find((sticker) => sticker.kind === 'books');
  return {
    short,
    stickers,
    mascotTop,
    mascotSize,
    bubble: {
      x: 228 * scale,
      y: mascotTop + (BUBBLE_BELOW_MASCOT_TOP * mascotSize) / MASCOT_SIZE,
      maxRight: books ? books.x - vars['--space-2'] : width - vars['--space-4'],
    },
    wordmarkTop,
    floor,
  } satisfies WelcomeLayout;
}

export function heroBottom(layout: WelcomeLayout) {
  return Math.max(
    ...layout.stickers.map((sticker) => sticker.y + sticker.height),
    layout.mascotTop + layout.mascotSize,
    layout.wordmarkTop + HERO_TEXT_HEIGHT,
  );
}

const EXAMPLE_REWARDS: Partial<Record<ObjectKind, Money>> = {
  parcel: { minor: 800, currency: 'MYR' },
  coffee: { minor: 500, currency: 'MYR' },
  ticket: { minor: 1500, currency: 'MYR' },
  books: { minor: 2000, currency: 'MYR' },
  boba: { minor: 600, currency: 'MYR' },
};

export function stickerExampleKey(kind: ObjectKind) {
  return `account.welcome.examples.${kind}` as const;
}

export function stickerExampleValues(kind: ObjectKind, language: string) {
  const reward = EXAMPLE_REWARDS[kind];
  return { amount: reward ? formatMoney(reward, language, { whole: true }) : '' };
}

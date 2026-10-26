import type { Sticker } from '@/lib/stickers';

export const BOOK_SLOTS = 6;
export const BOOK_COLUMNS = 3;

export type BookCard = { kind: 'sticker'; sticker: Sticker } | { kind: 'earlier' };

export type BookSlot =
  | (BookCard & { from: number | null; arrives: boolean; leaving: BookCard | null })
  | { kind: 'target' }
  | { kind: 'empty' };

export function targetSlot(count: number | null) {
  return count === null ? null : 0;
}

function card(previous: readonly Sticker[] | null, index: number): BookCard {
  const sticker = previous?.[index];
  return sticker ? { kind: 'sticker', sticker } : { kind: 'earlier' };
}

export function bookSlots(count: number | null, previous: readonly Sticker[] | null): BookSlot[] {
  if (count === null)
    return Array.from({ length: BOOK_SLOTS }, (_, index) => ({
      ...card(previous, index),
      from: null,
      arrives: false,
      leaving: null,
    }));
  const earlier = Math.min(Math.max(count - 1, 0), BOOK_SLOTS - 1);
  const leaving = count - 1 > earlier ? card(previous, earlier) : null;
  return Array.from({ length: BOOK_SLOTS }, (_, index): BookSlot => {
    if (index === 0) return { kind: 'target' };
    if (index > earlier) return { kind: 'empty' };
    const arrives = index === earlier;
    return {
      ...card(previous, index - 1),
      from: index - 1,
      arrives,
      leaving: arrives ? leaving : null,
    };
  });
}

export function shiftStart(from: number, to: number, columnStep: number, rowStep: number) {
  return {
    x: ((from % BOOK_COLUMNS) - (to % BOOK_COLUMNS)) * columnStep,
    y: (Math.floor(from / BOOK_COLUMNS) - Math.floor(to / BOOK_COLUMNS)) * rowStep,
  };
}

export type GroupLayout = { gap: number; height: number; scale: number };
export type Box = { x: number; y: number; width: number; height: number };

export function groupLayout(
  space: number,
  headline: number,
  panel: number,
  gap: { ideal: number; min: number },
): GroupLayout {
  const fitted = Math.min(gap.ideal, Math.max(gap.min, space - headline - panel));
  const height = headline + fitted + panel;
  return { gap: fitted, height, scale: Math.min(1, space / height) };
}

export function groupPoint(stage: Box, layout: GroupLayout, x: number, y: number) {
  return {
    x: stage.x + stage.width / 2 + (x - stage.width / 2) * layout.scale,
    y: stage.y + stage.height / 2 + (y - layout.height / 2) * layout.scale,
  };
}

export function groupDrop(stage: Box, layout: GroupLayout) {
  return (stage.height - layout.height * layout.scale) / (2 * layout.scale);
}

export type CelebrationBody =
  | { key: 'pay.celebrate.first.body' }
  | { key: 'pay.celebrate.routine.body'; count: number }
  | { key: 'pay.celebrate.unknownBody' };

export function celebrationBody(first: boolean, count: number | null): CelebrationBody {
  if (count === null) return { key: 'pay.celebrate.unknownBody' };
  if (first) return { key: 'pay.celebrate.first.body' };
  return { key: 'pay.celebrate.routine.body', count };
}

export type Glyph = { kind: 'digit'; digit: number } | { kind: 'mark'; text: string };

export function glyphs(text: string): Glyph[] {
  return [...text].map((char) =>
    /\d/.test(char) ? { kind: 'digit', digit: Number(char) } : { kind: 'mark', text: char },
  );
}

export type ConfettiPiece = {
  shape: 'star' | 'dot' | 'strip';
  size: number;
  colour: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  r1: number;
  r2: number;
};

export const CONFETTI_COLOURS = 8;

export function confettiPieces(count: number, seed = 7): ConfettiPiece[] {
  let state = seed;
  const random = () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
  const between = (low: number, high: number) => low + random() * (high - low);
  return Array.from({ length: count }, (_, index) => {
    const spread = count > 1 ? index / (count - 1) - 0.5 : 0;
    const angle = -Math.PI / 2 + spread * Math.PI * 1.5 + between(-0.15, 0.15);
    const distance = between(60, 120);
    const x1 = Math.cos(angle) * distance;
    const y1 = Math.sin(angle) * distance;
    const r1 = Math.round(between(-200, 200));
    return {
      shape: (['star', 'dot', 'strip'] as const)[index % 3],
      size: Math.round(between(10, 16)),
      colour: index % CONFETTI_COLOURS,
      x1,
      y1,
      x2: x1 * 1.3,
      y2: y1 + between(90, 160),
      r1,
      r2: r1 + Math.round(between(-160, 160)),
    };
  });
}

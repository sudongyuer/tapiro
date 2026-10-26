import type { Sticker } from '@/lib/stickers';

export const BOOK_SLOTS = 6;

export type BookSlot =
  | { kind: 'sticker'; sticker: Sticker }
  | { kind: 'earlier' }
  | { kind: 'target' }
  | { kind: 'empty' };

export function targetSlot(count: number) {
  return Math.min(Math.max(count, 1), BOOK_SLOTS) - 1;
}

export function bookSlots(count: number, previous: readonly Sticker[] | null): BookSlot[] {
  const target = targetSlot(count);
  return Array.from({ length: BOOK_SLOTS }, (_, index): BookSlot => {
    if (index === target) return { kind: 'target' };
    if (index > target) return { kind: 'empty' };
    const sticker = previous?.[index];
    return sticker ? { kind: 'sticker', sticker } : { kind: 'earlier' };
  });
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

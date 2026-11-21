import type { HandArtId } from '@/lib/handArt';
import { stickerArt, type Sticker } from '@/lib/stickers/model';

import { byDay, type Month } from './calendar';

export const POSTER_BACKGROUNDS = ['paper', 'tint', 'night'] as const;
export type PosterBackground = (typeof POSTER_BACKGROUNDS)[number];

export function nextBackground(current: PosterBackground): PosterBackground {
  return POSTER_BACKGROUNDS[(POSTER_BACKGROUNDS.indexOf(current) + 1) % POSTER_BACKGROUNDS.length];
}

export type PosterCard = { art: HandArtId; earnedAt: string; title: string };

export function posterCard(sticker: Sticker): PosterCard {
  return { art: stickerArt(sticker), earnedAt: sticker.earnedAt, title: sticker.title };
}

export type PosterDay = { art: HandArtId; count: number };
export type PosterMonth = { month: Month; days: Map<number, PosterDay>; total: number };

export function posterMonth(stickers: readonly Sticker[], month: Month): PosterMonth {
  const days = new Map<number, PosterDay>();
  let total = 0;
  for (const [day, list] of byDay(stickers, month)) {
    days.set(day, { art: stickerArt(list[0]), count: list.length });
    total += list.length;
  }
  return { month, days, total };
}

export type CollagePiece = { art: HandArtId; x: number; y: number; size: number; rotate: number };

const SLOTS: Omit<CollagePiece, 'art'>[] = [
  { x: -0.12, y: -0.04, size: 0.52, rotate: -14 },
  { x: 0.62, y: -0.06, size: 0.46, rotate: 12 },
  { x: 0.7, y: 0.36, size: 0.42, rotate: -8 },
  { x: -0.16, y: 0.42, size: 0.44, rotate: 9 },
  { x: 0.02, y: 0.78, size: 0.5, rotate: -6 },
  { x: 0.6, y: 0.8, size: 0.48, rotate: 15 },
  { x: 0.34, y: 0.92, size: 0.34, rotate: -18 },
];

export function collage(arts: readonly HandArtId[]): CollagePiece[] {
  const distinct = [...new Set(arts)];
  if (distinct.length === 0) return [];
  return SLOTS.map((slot, index) => ({ ...slot, art: distinct[index % distinct.length] }));
}

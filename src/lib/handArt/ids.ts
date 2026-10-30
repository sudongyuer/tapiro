import type { BountyCategory } from '@/lib/stickers/category';

export const HAND_ART_IDS = [
  'parcel',
  'tea',
  'bag',
  'food',
  'medicine',
  'queue',
  'document',
  'move',
  'study',
  'accompany',
  'car',
  'other',
] as const;
export type HandArtId = (typeof HAND_ART_IDS)[number];

export function handArtId(value: unknown): HandArtId | null {
  return HAND_ART_IDS.find((id) => id === value) ?? null;
}

export const CATEGORY_ART: Record<BountyCategory, HandArtId> = {
  pickup: 'parcel',
  buy: 'bag',
  queue: 'queue',
  handle: 'document',
  move: 'move',
  accompany: 'accompany',
  study: 'study',
  other: 'other',
};

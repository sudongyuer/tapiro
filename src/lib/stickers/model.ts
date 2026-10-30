import { handArtFor, type HandArtId } from '@/lib/handArt';

import { bountyCategory } from './category';

export type StickerKind = 'bounty' | 'ride';
export const STICKER_KINDS: readonly StickerKind[] = ['bounty', 'ride'];

export type StickerRole = 'payee' | 'payer';
export const STICKER_ROLES: readonly StickerRole[] = ['payee', 'payer'];

export type Sticker = {
  id: string;
  paymentId: string;
  role: StickerRole;
  itemKind: StickerKind;
  category: string | null;
  art: string | null;
  title: string;
  earnedAt: string;
  counterpartName: string | null;
};

export function stickerArt(
  sticker: Pick<Sticker, 'itemKind' | 'category' | 'art' | 'title'>,
): HandArtId {
  if (sticker.itemKind === 'ride') return 'car';
  return handArtFor({ ...sticker, category: bountyCategory(sticker.category) });
}

export function newestFirst<T extends { id: string; earnedAt: string }>(stickers: readonly T[]) {
  return [...stickers].sort(
    (a, b) => b.earnedAt.localeCompare(a.earnedAt) || b.id.localeCompare(a.id),
  );
}

export type StickerService = {
  list(userId: string): Promise<Sticker[]>;
};

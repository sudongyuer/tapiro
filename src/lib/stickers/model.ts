import { bountyCategory, type BountyCategory } from './category';

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
  title: string;
  earnedAt: string;
  counterpartName: string | null;
};

export type StickerArt =
  { kind: 'car' } | { kind: 'mascot' } | { kind: 'category'; category: BountyCategory };

export function stickerArt(sticker: Pick<Sticker, 'itemKind' | 'category'>): StickerArt {
  if (sticker.itemKind === 'ride') return { kind: 'car' };
  const category = bountyCategory(sticker.category);
  return category ? { kind: 'category', category } : { kind: 'mascot' };
}

export function newestFirst<T extends { id: string; earnedAt: string }>(stickers: readonly T[]) {
  return [...stickers].sort(
    (a, b) => b.earnedAt.localeCompare(a.earnedAt) || b.id.localeCompare(a.id),
  );
}

export type StickerService = {
  list(userId: string): Promise<Sticker[]>;
};

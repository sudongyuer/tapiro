import { bountyCategory, type BountyCategory } from './category';

export type StickerKind = 'bounty' | 'ride';

export type Sticker = {
  id: string;
  paymentId: string;
  itemKind: StickerKind;
  category: string | null;
  title: string;
  earnedAt: string;
};

export type StickerArt =
  { kind: 'car' } | { kind: 'mascot' } | { kind: 'category'; category: BountyCategory };

export function stickerArt(sticker: Pick<Sticker, 'itemKind' | 'category'>): StickerArt {
  if (sticker.itemKind === 'ride') return { kind: 'car' };
  const category = bountyCategory(sticker.category);
  return category ? { kind: 'category', category } : { kind: 'mascot' };
}

export function newestFirst(stickers: readonly Sticker[]) {
  return [...stickers].sort(
    (a, b) => b.earnedAt.localeCompare(a.earnedAt) || b.id.localeCompare(a.id),
  );
}

export type StickerService = {
  list(userId: string): Promise<Sticker[]>;
};

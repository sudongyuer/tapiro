export type StickerKind = 'bounty' | 'ride';

export type Sticker = {
  id: string;
  paymentId: string;
  itemKind: StickerKind;
  category: string | null;
  title: string;
  earnedAt: string;
};

export type StickerArt = 'car' | 'mascot';

export function stickerArt(sticker: Pick<Sticker, 'itemKind' | 'category'>): StickerArt {
  if (sticker.itemKind === 'ride') return 'car';
  return 'mascot';
}

export function newestFirst(stickers: readonly Sticker[]) {
  return [...stickers].sort(
    (a, b) => b.earnedAt.localeCompare(a.earnedAt) || b.id.localeCompare(a.id),
  );
}

export type StickerService = {
  list(userId: string): Promise<Sticker[]>;
};

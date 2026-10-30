import type { SFSymbol } from 'expo-symbols';

import { CATEGORY_ART, type HandArtId } from '@/lib/handArt';
import type { BountyCategory } from '@/lib/stickers/category';

import { token, type ThemeName, type TokenName } from './theme/tokens';

export const CATEGORY_SYMBOLS: Record<BountyCategory, SFSymbol> = {
  pickup: 'tray.and.arrow.down.fill',
  buy: 'bag.fill',
  queue: 'person.3.fill',
  handle: 'doc.text.fill',
  move: 'shippingbox.fill',
  accompany: 'figure.walk',
  study: 'book.fill',
  other: 'ellipsis',
};

export const categoryColorToken = (category: BountyCategory): TokenName =>
  `--color-sticker-${category}`;

export type CategoryArt = { color: string; ink: string; symbol: SFSymbol; image: HandArtId };

export function categoryArt(
  category: BountyCategory,
  theme: ThemeName,
  image: HandArtId = CATEGORY_ART[category],
): CategoryArt {
  return {
    color: String(token(categoryColorToken(category), theme)),
    ink: String(token('--color-on-sticker', theme)),
    symbol: CATEGORY_SYMBOLS[category],
    image,
  };
}

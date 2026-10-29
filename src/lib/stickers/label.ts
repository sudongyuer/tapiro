import type { TFunction } from 'i18next';

import type { Sticker } from './model';

export type StickerLabel = { line1: string; title: string };

export function stickerLabel(
  sticker: Pick<Sticker, 'role' | 'itemKind' | 'title' | 'counterpartName'>,
  t: TFunction,
): StickerLabel {
  const name = sticker.counterpartName?.trim() || null;
  const direction = sticker.itemKind === 'ride' ? 'ride' : sticker.role;
  const line1 = name
    ? t(`stickers.label.${direction}`, { name })
    : t(`stickers.label.${direction}Unnamed`);
  return { line1, title: sticker.title };
}

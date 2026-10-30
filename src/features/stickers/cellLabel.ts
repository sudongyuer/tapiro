import type { TFunction } from 'i18next';

import { stickerLabel } from '@/lib/stickers/label';
import type { Sticker } from '@/lib/stickers/model';

export type CellLabel = { line1: string; title: string; a11y: string };

export function cellLabel(
  sticker: Pick<Sticker, 'role' | 'itemKind' | 'title' | 'counterpartName'>,
  date: string,
  t: TFunction,
): CellLabel {
  const { line1, title } = stickerLabel(sticker, t);
  return { line1, title, a11y: t('stickers.label.a11y', { line1, title, date }) };
}

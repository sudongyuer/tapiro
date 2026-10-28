import type { TFunction } from 'i18next';

import { formatDistance } from './axis';
import type { BoardRow } from './types';

export function markLabel(rows: BoardRow[], t: TFunction, language: string) {
  const titles = rows.map((row) => row.title).join(t('bounty.board.axis.titleJoin'));
  const near = rows[0]?.distanceM ?? 0;
  const far = rows.at(-1)?.distanceM ?? near;
  const distance =
    near === far
      ? formatDistance(near, language)
      : t('bounty.board.axis.range', {
          from: formatDistance(near, language),
          to: formatDistance(far, language),
        });
  return t('bounty.board.axis.mark', { titles, distance });
}

export type ScrollFrame = {
  cardY: number;
  topInset: number;
  contentHeight: number;
  viewportHeight: number;
};

export function scrollTarget({ cardY, topInset, contentHeight, viewportHeight }: ScrollFrame) {
  return Math.min(cardY - topInset, Math.max(0, contentHeight - viewportHeight));
}

export const SETTLED_PT = 1;

export function needsScroll(target: number, offset: number | null) {
  return offset === null || Math.abs(target - offset) >= SETTLED_PT;
}

import { handArtFor } from '@/lib/handArt';
import type { Point } from '@/lib/location/types';
import { formatMoney } from '@/lib/money';
import type { BountyCategory } from '@/lib/stickers/category';
import { categoryArt, type CategoryArt } from '@/ui/categoryArt';
import { token, type ThemeName } from '@/ui/theme/tokens';

import type { BoardRow } from '../board/types';

export type MapPin = {
  id: string;
  point: Point;
  rowId: string;
  label: string;
  a11yLabel: string;
  art: CategoryArt;
  fan: { index: number; of: number };
  applied: boolean;
  stamp: { text: string; ink: string; fill: string };
};

export type PinText = (
  key:
    | `bounty.category.${BountyCategory}`
    | 'bounty.board.map.pin'
    | 'bounty.board.card.applied'
    | 'bounty.board.card.separator'
    | 'bounty.stamp',
  options?: { title: string; reward: string },
) => string;

const pointKey = ({ latitude, longitude }: Point) =>
  `${latitude.toFixed(6)},${longitude.toFixed(6)}`;

export function mapPins(
  rows: readonly BoardRow[],
  t: PinText,
  language: string,
  theme: ThemeName,
  held: ReadonlySet<string> = new Set(),
): MapPin[] {
  const stamp = {
    text: t('bounty.stamp'),
    ink: String(token('--color-success', theme)),
    fill: String(token('--color-receipt', theme)),
  };
  const seen = new Set<string>();
  const placed = rows.flatMap((row) => {
    if (row.point === null || seen.has(row.id)) return [];
    seen.add(row.id);
    return [{ row, point: row.point, key: pointKey(row.point) }];
  });
  const groups = new Map<string, number>();
  for (const { key } of placed) groups.set(key, (groups.get(key) ?? 0) + 1);
  const taken = new Map<string, number>();
  return placed.map(({ row, point, key }) => {
    const index = taken.get(key) ?? 0;
    taken.set(key, index + 1);
    const said = t('bounty.board.map.pin', {
      title: row.title,
      reward: formatMoney(row.reward, language, { whole: true }),
    });
    return {
      id: row.id,
      point,
      rowId: row.id,
      label: t(`bounty.category.${row.category}`),
      a11yLabel: row.appliedByMe
        ? [said, t('bounty.board.card.applied')].join(t('bounty.board.card.separator'))
        : said,
      art: categoryArt(row.category, theme, handArtFor(row)),
      fan: { index, of: groups.get(key) ?? 1 },
      applied: row.appliedByMe && !held.has(row.id),
      stamp,
    };
  });
}

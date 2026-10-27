import { FALLBACK_LANGUAGE, isLanguage } from '@/lib/i18n/languages';
import { resources } from '@/lib/i18n/resources';
import type { BountyCategory } from '@/lib/stickers/category';

import type { BoardRow } from './types';

export const AXIS_RANGE_M = 2000;

export type AxisMark = { ids: string[]; x: number; category: BountyCategory };

export function axisMarks(
  rows: BoardRow[],
  widthPt: number,
): { marks: AxisMark[]; beyond: number; firstBeyondId: string | null } {
  const marks: AxisMark[] = [];
  let beyond = 0;
  let firstBeyondId: string | null = null;
  for (const row of rows) {
    if (row.distanceM === null) continue;
    if (row.distanceM > AXIS_RANGE_M) {
      beyond += 1;
      firstBeyondId ??= row.id;
      continue;
    }
    marks.push({
      ids: [row.id],
      x: (row.distanceM / AXIS_RANGE_M) * widthPt,
      category: row.category,
    });
  }
  return { marks, beyond, firstBeyondId };
}

export function formatDistance(m: number, language: string): string {
  const locale = isLanguage(language) ? language : FALLBACK_LANGUAGE;
  const { distance } = resources[locale].translation.bounty.board;
  const number = (value: number, digits: number) =>
    new Intl.NumberFormat(locale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  if (m < 1000) return distance.meters.replace('{{value}}', number(Math.round(m), 0));
  const km = Math.round(m / 100) / 10;
  return distance.kilometers.replace(
    '{{value}}',
    km < 10 ? number(km, 1) : number(Math.round(km), 0),
  );
}

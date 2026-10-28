import { FALLBACK_LANGUAGE, isLanguage } from '@/lib/i18n/languages';
import { resources } from '@/lib/i18n/resources';
import type { BountyCategory } from '@/lib/stickers/category';

import type { BoardRow } from './types';

export const AXIS_RANGE_M = 2000;
export const AXIS_MERGE_PT = 44;

export type AxisMark = { ids: string[]; x: number; category: BountyCategory };

export function axisMarks(
  rows: BoardRow[],
  widthPt: number,
  startPt = 0,
): { marks: AxisMark[]; beyond: number; firstBeyondId: string | null } {
  const plotted: { id: string; x: number; category: BountyCategory }[] = [];
  let beyond = 0;
  let firstBeyondId: string | null = null;
  for (const row of rows) {
    if (row.distanceM === null) continue;
    if (row.distanceM > AXIS_RANGE_M) {
      beyond += 1;
      firstBeyondId ??= row.id;
      continue;
    }
    plotted.push({
      id: row.id,
      x: Math.max(startPt, (row.distanceM / AXIS_RANGE_M) * widthPt),
      category: row.category,
    });
  }
  plotted.sort((a, b) => a.x - b.x);
  const marks: AxisMark[] = [];
  for (const { id, x, category } of plotted) {
    const last = marks.at(-1);
    if (last && x - last.x < AXIS_MERGE_PT) last.ids.push(id);
    else marks.push({ ids: [id], x, category });
  }
  return { marks, beyond, firstBeyondId };
}

export function beyondCount({
  rows,
  beyondTotal,
  next,
}: {
  rows: BoardRow[];
  beyondTotal: number | null;
  next: unknown | null;
}): number | null {
  const beyond = rows.filter(
    (row) => row.distanceM !== null && row.distanceM > AXIS_RANGE_M,
  ).length;
  if (next === null) return beyond;
  return beyondTotal === null ? null : Math.max(beyond, beyondTotal);
}

export function formatDistance(m: number, language: string): string {
  const locale = isLanguage(language) ? language : FALLBACK_LANGUAGE;
  const { distance } = resources[locale].translation.bounty.board;
  const number = (value: number, digits: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value);
  const km = Math.round(m / 100) / 10;
  const text =
    m < 1000
      ? distance.meters.replace('{{value}}', number(Math.round(m), 0))
      : distance.kilometers.replace(
          '{{value}}',
          km < 10 ? number(km, 1) : number(Math.round(km), 0),
        );
  return text.replace(/ /g, '\u00A0');
}

import type { CoinReason, CoinRow } from './types';

export type MonthGroup = { month: string; rows: CoinRow[] };

export function groupByMonth(rows: readonly CoinRow[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (last && last.month === row.month) last.rows.push(row);
    else groups.push({ month: row.month, rows: [row] });
  }
  return groups;
}

export const reasonKey = (reason: CoinReason | 'other') => `coins.reason.${reason}` as const;

export const signedDelta = (delta: number) => (delta > 0 ? `+${delta}` : `−${-delta}`);

import type { Month } from './calendar';

export type ShareTarget = { card: string } | { month: Month };

const MONTH = /^(\d{4})-(\d{1,2})$/;

export function parseShareTarget(card: unknown, month: unknown): ShareTarget | null {
  if (typeof card === 'string' && card) return { card };
  const match = typeof month === 'string' ? MONTH.exec(month) : null;
  if (!match) return null;
  const parsed: Month = { year: Number(match[1]), month: Number(match[2]) - 1 };
  return parsed.month >= 0 && parsed.month < 12 ? { month: parsed } : null;
}

export const monthParam = ({ year, month }: Month) => `${year}-${month + 1}`;

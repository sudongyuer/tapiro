export type Month = { year: number; month: number };

const DAYS_IN_WEEK = 7;

export function monthOf(iso: string): Month {
  const date = new Date(iso);
  return { year: date.getFullYear(), month: date.getMonth() };
}

export const monthIndex = ({ year, month }: Month) => year * 12 + month;

export function shiftMonth({ year, month }: Month, delta: number): Month {
  const index = year * 12 + month + delta;
  return { year: Math.floor(index / 12), month: ((index % 12) + 12) % 12 };
}

export function monthRange(earned: readonly string[], now: Date): { first: Month; last: Month } {
  const last = { year: now.getFullYear(), month: now.getMonth() };
  const first = earned
    .map(monthOf)
    .reduce(
      (earliest, month) => (monthIndex(month) < monthIndex(earliest) ? month : earliest),
      last,
    );
  return { first, last };
}

export function monthGrid({ year, month }: Month): (number | null)[] {
  const lead = (new Date(year, month, 1).getDay() + 6) % DAYS_IN_WEEK;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: days }, (_, index) => index + 1),
  ];
  while (cells.length % DAYS_IN_WEEK !== 0) cells.push(null);
  return cells;
}

export function byDay<T extends { earnedAt: string }>(items: readonly T[], { year, month }: Month) {
  const days = new Map<number, T[]>();
  for (const item of items) {
    const date = new Date(item.earnedAt);
    if (date.getFullYear() !== year || date.getMonth() !== month) continue;
    const day = date.getDate();
    days.set(day, [...(days.get(day) ?? []), item]);
  }
  return days;
}

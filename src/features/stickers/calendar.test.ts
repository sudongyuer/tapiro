import { describe, expect, test } from 'bun:test';

import { byDay, monthGrid, monthRange, shiftMonth } from './calendar';

const at = (year: number, month: number, day: number, hour = 12) =>
  new Date(year, month, day, hour).toISOString();

describe('month grid', () => {
  test('October 2026 starts on a Thursday, so a Monday-first grid leads with three blanks', () => {
    const cells = monthGrid({ year: 2026, month: 9 });
    expect(cells.slice(0, 4)).toEqual([null, null, null, 1]);
    expect(cells.filter((cell) => cell !== null)).toHaveLength(31);
    expect(cells.length % 7).toBe(0);
  });

  test('a month starting on Monday has no leading blank; February 2027 has 28 days', () => {
    expect(monthGrid({ year: 2026, month: 5 })[0]).toBe(1);
    const february = monthGrid({ year: 2027, month: 1 });
    expect(Math.max(...february.filter((cell): cell is number => cell !== null))).toBe(28);
  });
});

describe('months', () => {
  test('shifting crosses years both ways', () => {
    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
    expect(shiftMonth({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
  });

  test('the range runs from the earliest sticker to this month', () => {
    const now = new Date(2026, 9, 30);
    expect(monthRange([at(2026, 7, 3), at(2026, 9, 1)], now)).toEqual({
      first: { year: 2026, month: 7 },
      last: { year: 2026, month: 9 },
    });
    expect(monthRange([], now).first).toEqual({ year: 2026, month: 9 });
  });
});

test('stickers group by their local day inside the shown month only', () => {
  const items = [
    { id: 'a', earnedAt: at(2026, 9, 3) },
    { id: 'b', earnedAt: at(2026, 9, 3, 23) },
    { id: 'c', earnedAt: at(2026, 9, 30) },
    { id: 'd', earnedAt: at(2026, 8, 3) },
  ];
  const days = byDay(items, { year: 2026, month: 9 });
  expect(days.get(3)?.map((item) => item.id)).toEqual(['a', 'b']);
  expect(days.get(30)?.map((item) => item.id)).toEqual(['c']);
  expect(days.size).toBe(2);
});

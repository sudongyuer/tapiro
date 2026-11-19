import { describe, expect, test } from 'bun:test';

import { dayShift } from './verifyToday';

describe('dayShift', () => {
  const now = new Date(2026, 10, 19, 14, 30);

  test('moves to the given day by whole days', () => {
    const shifted = new Date(now.getTime() + dayShift(now, '2026-12-09'));
    expect([
      shifted.getMonth(),
      shifted.getDate(),
      shifted.getHours(),
      shifted.getMinutes(),
    ]).toEqual([11, 9, 14, 30]);
  });

  test('moves back as well', () => {
    const shifted = new Date(now.getTime() + dayShift(now, '2026-11-09'));
    expect(shifted.getDate()).toBe(9);
  });

  test('leaves the clock alone without a well-formed day', () => {
    expect(dayShift(now, undefined)).toBe(0);
    expect(dayShift(now, '9 Dec')).toBe(0);
  });
});

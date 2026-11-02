import { describe, expect, test } from 'bun:test';

import { farePeople, perPersonAbout } from './perPerson';

describe('每人约 (221)', () => {
  test('the estimate is divided by the seats before 出发 and by the boarded people after', () => {
    expect(farePeople(4, null)).toBe(4);
    expect(farePeople(4, 3)).toBe(3);
    expect(perPersonAbout(7600, farePeople(4, null), 2)).toBe(1900);
    expect(perPersonAbout(7600, farePeople(4, 3), 2)).toBe(2500);
  });

  test('the share is rounded to the nearest whole unit', () => {
    expect(perPersonAbout(7600, 6, 2)).toBe(1300);
    expect(perPersonAbout(7500, 6, 2)).toBe(1300);
    expect(perPersonAbout(7400, 6, 2)).toBe(1200);
    expect(perPersonAbout(8000, 3, 0)).toBe(2667);
  });

  test('a tiny estimate still reads as one unit, never zero', () => {
    expect(perPersonAbout(100, 6, 2)).toBe(100);
  });
});

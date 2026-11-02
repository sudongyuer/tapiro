import { describe, expect, test } from 'bun:test';

import { equalSplit, organiserShare, shareStep, splitProblem } from './split';

describe('equal split', () => {
  test('each rider is rounded up to 0.10 and the organiser keeps the remainder', () => {
    expect(equalSplit(7600, 4, 2)).toEqual({ rider: 1900, organiser: 1900 });
    expect(equalSplit(7650, 4, 2)).toEqual({ rider: 1920, organiser: 1890 });
    expect(equalSplit(10000, 3, 2)).toEqual({ rider: 3340, organiser: 3320 });
    expect(equalSplit(1001, 6, 2)).toEqual({ rider: 170, organiser: 151 });
  });

  test('the parts always add up to the total and the riders never pay less than an equal share', () => {
    for (const total of [100, 999, 1234, 7650, 25003, 100000]) {
      for (let people = 2; people <= 6; people += 1) {
        const { rider, organiser } = equalSplit(total, people, 2);
        expect(rider * (people - 1) + organiser).toBe(total);
        expect(organiser).toBeGreaterThanOrEqual(0);
        expect(rider * people).toBeGreaterThanOrEqual(total);
      }
    }
  });

  test('the step follows the currency: 0.10 for two digits, one unit without minor digits', () => {
    expect(shareStep(2)).toBe(10);
    expect(shareStep(3)).toBe(100);
    expect(shareStep(0)).toBe(1);
    expect(equalSplit(1000, 3, 0)).toEqual({ rider: 334, organiser: 332 });
  });

  test('a tiny total never leaves the organiser below zero', () => {
    expect(equalSplit(121, 6, 2)).toEqual({ rider: 24, organiser: 1 });
    expect(equalSplit(100, 6, 2)).toEqual({ rider: 20, organiser: 0 });
  });

  test('the organiser alone pays the whole fare', () => {
    expect(equalSplit(4500, 1, 2)).toEqual({ rider: 0, organiser: 4500 });
  });

  test('a total that is not a positive whole number is refused', () => {
    expect(() => equalSplit(0, 3, 2)).toThrow(RangeError);
    expect(() => equalSplit(10.5, 3, 2)).toThrow(RangeError);
  });
});

describe('edited split (220 A)', () => {
  test('the organiser row is the total minus everyone else', () => {
    expect(organiserShare(7600, [1900, 2500, 1900])).toBe(1300);
    expect(organiserShare(7600, [3800, 3800])).toBe(0);
  });

  test('riders above the total, a zero share or no riders cannot be sent', () => {
    expect(splitProblem(7600, [1900, 1900, 1900])).toBeNull();
    expect(splitProblem(7600, [3800, 3800])).toBeNull();
    expect(splitProblem(7600, [4000, 3700])).toBe('overTotal');
    expect(splitProblem(7600, [1900, 0])).toBe('notPositive');
    expect(splitProblem(7600, [])).toBe('noRiders');
    expect(splitProblem(7600, [19.5])).toBe('notWhole');
  });
});

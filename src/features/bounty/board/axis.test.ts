import { describe, expect, test } from 'bun:test';

import { axisMarks, formatDistance } from './axis';
import type { BoardRow } from './types';

const row = (id: string, distanceM: number | null): BoardRow => ({
  id,
  title: id,
  category: 'move',
  rewardSen: 800,
  placeLabel: distanceM === null ? null : 'Sunway',
  stickerPath: null,
  startsAt: null,
  endsAt: null,
  deadlineAt: null,
  urgent: false,
  distanceM,
  appliedByMe: false,
  createdAt: '2026-10-27T03:00:00.000Z',
  poster: { id: 'p', name: '小林', tier: 'reliable' },
});

describe('axisMarks', () => {
  const rows = [
    row('near', 300),
    row('edge', 2000),
    row('mid', 1600),
    row('far', 3400),
    row('farther', 18_400),
    row('nowhere', null),
  ];

  test('marks located rows within 2 km at their distance along the width', () => {
    const { marks } = axisMarks(rows, 300);
    expect(marks).toEqual([
      { ids: ['near'], x: 45, category: 'move' },
      { ids: ['edge'], x: 300, category: 'move' },
      { ids: ['mid'], x: 240, category: 'move' },
    ]);
  });

  test('rows beyond 2 km and unlocated rows are not marked', () => {
    const ids = axisMarks(rows, 300).marks.flatMap((mark) => mark.ids);
    expect(ids).not.toContain('far');
    expect(ids).not.toContain('farther');
    expect(ids).not.toContain('nowhere');
  });

  test('beyond counts located rows over 2000 m; the first such row is the target', () => {
    expect(axisMarks(rows, 300)).toMatchObject({ beyond: 2, firstBeyondId: 'far' });
    expect(axisMarks([row('a', 100), row('b', null)], 300)).toMatchObject({
      beyond: 0,
      firstBeyondId: null,
    });
  });
});

describe('formatDistance', () => {
  const cases = [100, 950, 1000, 1600, 18_400];

  test.each(['zh-Hans', 'en', 'ms'])('%s', (language) => {
    expect(cases.map((m) => formatDistance(m, language))).toEqual([
      '100 m',
      '950 m',
      '1 km',
      '1.6 km',
      '18 km',
    ]);
  });

  test('an unknown language falls back to the default copy', () => {
    expect(formatDistance(1600, 'fr')).toBe('1.6 km');
  });

  test('a whole kilometre drops the trailing zero', () => {
    expect(formatDistance(2000, 'en')).toBe('2 km');
    expect(formatDistance(9960, 'en')).toBe('10 km');
  });
});

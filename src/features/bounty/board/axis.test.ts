import { describe, expect, test } from 'bun:test';

import { axisMarks, beyondCount, formatDistance } from './axis';
import type { BoardRow } from './types';

const row = (id: string, distanceM: number | null): BoardRow => ({
  id,
  title: id,
  category: 'move',
  reward: { minor: 800, currency: 'MYR' },
  reference: null,
  placeLabel: distanceM === null ? null : 'Sunway',
  stickerPath: null,
  startsAt: null,
  endsAt: null,
  deadlineAt: null,
  urgent: false,
  distanceM,
  point: null,
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

  test('marks located rows within 2 km at their distance along the width, nearest first', () => {
    const { marks } = axisMarks(rows, 300);
    expect(marks).toEqual([
      { ids: ['near'], x: 45, category: 'move' },
      { ids: ['mid'], x: 240, category: 'move' },
      { ids: ['edge'], x: 300, category: 'move' },
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

describe('axisMarks merging', () => {
  const typed = (id: string, distanceM: number, category: BoardRow['category']) => ({
    ...row(id, distanceM),
    category,
  });

  test('marks closer than 44 pt merge into one at the nearest, keeping ids in distance order', () => {
    const { marks } = axisMarks(
      [
        typed('a', 300, 'pickup'),
        typed('b', 500, 'buy'),
        typed('c', 800, 'accompany'),
        typed('d', 900, 'handle'),
        typed('e', 1200, 'study'),
        typed('f', 1600, 'move'),
        typed('g', 1900, 'pickup'),
      ],
      260,
    );
    expect(marks).toEqual([
      { ids: ['a', 'b'], x: 39, category: 'pickup' },
      { ids: ['c', 'd'], x: 104, category: 'accompany' },
      { ids: ['e'], x: 156, category: 'study' },
      { ids: ['f', 'g'], x: 208, category: 'move' },
    ]);
  });

  test('a group is measured from its nearest mark, so drawn marks stay 44 pt apart', () => {
    const { marks } = axisMarks([row('a', 0), row('b', 200), row('c', 400), row('d', 600)], 400);
    expect(marks.map((mark) => mark.ids)).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
    expect(marks.map((mark) => mark.x)).toEqual([0, 80]);
  });

  test('marks exactly 44 pt apart stay separate', () => {
    const { marks } = axisMarks([row('a', 0), row('b', 440)], 200);
    expect(marks.map((mark) => mark.ids)).toEqual([['a'], ['b']]);
  });

  test('rows at the same distance keep the RPC order inside the group', () => {
    const { marks } = axisMarks([row('z', 700), row('y', 700), row('x', 100)], 300);
    expect(marks.map((mark) => mark.ids)).toEqual([['x'], ['z', 'y']]);
  });
});

describe('axisMarks start', () => {
  test('a sticker near the origin is drawn clear of the origin dot', () => {
    const { marks } = axisMarks([row('a', 100), row('b', 1000)], 250, 20);
    expect(marks.map((mark) => mark.x)).toEqual([20, 125]);
  });

  test('the shifted mark still merges by its drawn position', () => {
    const { marks } = axisMarks([row('a', 100), row('b', 400)], 250, 20);
    expect(marks.map((mark) => mark.ids)).toEqual([['a', 'b']]);
  });
});

describe('beyondCount', () => {
  const located = (n: number, from: number) =>
    Array.from({ length: n }, (_, i) => row(`r${from + i}`, 200 + (from + i) * 100));

  test('with every page loaded it counts the loaded rows beyond 2 km', () => {
    const rows = [row('a', 300), row('b', 3400), row('c', 5200), row('d', null)];
    expect(beyondCount({ rows, beyondTotal: 3, next: null })).toBe(2);
  });

  test('with more pages it is the server count of farther bounties', () => {
    const rows = [...located(15, 0), row('far1', 2400), row('far2', 2600)];
    expect(beyondCount({ rows, beyondTotal: 27, next: { id: 'x' } })).toBe(27);
  });

  test('a first page entirely within 2 km reads the server count, not the rows still to load', () => {
    const rows = located(18, 0);
    expect(rows.every((r) => (r.distanceM ?? 0) <= 2000)).toBe(true);
    expect(beyondCount({ rows, beyondTotal: 0, next: { id: 'x' } })).toBe(0);
    expect(beyondCount({ rows, beyondTotal: 4, next: { id: 'x' } })).toBe(4);
  });

  test('unloaded bounties without a place are not counted as farther', () => {
    const rows = [...located(15, 0), row('far1', 2400), row('far2', 2600)];
    expect(beyondCount({ rows, beyondTotal: 2, next: { id: 'x' } })).toBe(2);
  });

  test('with more pages and no server count (after a block) it shows no number', () => {
    const rows = [...located(15, 0), row('far1', 2400), row('far2', 2600)];
    expect(beyondCount({ rows, beyondTotal: null, next: { id: 'x' } })).toBeNull();
  });

  test('with every page loaded and no server count it counts the loaded rows', () => {
    const rows = [row('a', 2600), row('b', 300)];
    expect(beyondCount({ rows, beyondTotal: null, next: null })).toBe(1);
  });

  test('never less than the loaded rows beyond 2 km', () => {
    const rows = [row('a', 2600), row('b', 2700)];
    expect(beyondCount({ rows, beyondTotal: 1, next: { id: 'x' } })).toBe(2);
  });
});

describe('formatDistance', () => {
  const cases = [100, 950, 1000, 1600, 18_400];

  test.each(['zh-Hans', 'en', 'ms'])('%s', (language) => {
    expect(cases.map((m) => formatDistance(m, language))).toEqual([
      '100\u00A0m',
      '950\u00A0m',
      '1\u00A0km',
      '1.6\u00A0km',
      '18\u00A0km',
    ]);
  });

  test('an unknown language falls back to the default copy', () => {
    expect(formatDistance(1600, 'fr')).toBe('1.6\u00A0km');
  });

  test('the number and its unit never wrap apart', () => {
    expect(formatDistance(1800, 'ms')).toBe('1.8\u00A0km');
    expect(formatDistance(300, 'zh-Hans')).toBe('300\u00A0m');
  });

  test('a whole kilometre drops the trailing zero', () => {
    expect(formatDistance(2000, 'en')).toBe('2\u00A0km');
    expect(formatDistance(9960, 'en')).toBe('10\u00A0km');
  });
});

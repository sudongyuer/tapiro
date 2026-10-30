import { describe, expect, test } from 'bun:test';

import { toBoardPage, toBoardRow } from './parse';

const RAW = {
  id: 'b1',
  title: '帮取快递',
  category: 'pickup',
  rewardMinor: 800,
  rewardCurrency: 'MYR',
  placeLabel: 'Sunway Geo 宿舍',
  stickerPath: null,
  startsAt: null,
  endsAt: null,
  deadlineAt: null,
  urgent: false,
  distanceM: 300,
  point: { latitude: 3.071, longitude: 101.608 },
  appliedByMe: false,
  createdAt: '2026-10-27T03:50:00+00:00',
  poster: { id: 'p1', name: '小林', tier: 'reliable' },
};

describe('toBoardRow point', () => {
  test('reads the snapped point', () => {
    expect(toBoardRow(RAW).point).toEqual({ latitude: 3.071, longitude: 101.608 });
  });

  test('a bounty without a place has a null point', () => {
    expect(toBoardRow({ ...RAW, placeLabel: null, distanceM: null, point: null }).point).toBeNull();
  });

  test.each([
    ['missing', undefined],
    ['a string', '3.071,101.608'],
    ['an array', [3.071, 101.608]],
    ['a missing longitude', { latitude: 3.071 }],
    ['a string latitude', { latitude: '3.071', longitude: 101.608 }],
    ['a NaN latitude', { latitude: Number.NaN, longitude: 101.608 }],
    ['an infinite longitude', { latitude: 3.071, longitude: Infinity }],
    ['a latitude beyond 90', { latitude: 90.001, longitude: 101.608 }],
    ['a longitude beyond -180', { latitude: 3.071, longitude: -180.5 }],
  ])('%s fails the read', (_label, point) => {
    expect(() => toBoardRow({ ...RAW, point })).toThrow('point');
  });

  test('the edges of the range are valid', () => {
    expect(toBoardRow({ ...RAW, point: { latitude: -90, longitude: 180 } }).point).toEqual({
      latitude: -90,
      longitude: 180,
    });
  });

  test('one bad point fails the whole page, never a shorter list', () => {
    const bad = { ...RAW, id: 'b2', point: { latitude: 3.071, longitude: 999 } };
    expect(() => toBoardPage({ items: [RAW, bad], next: null })).toThrow('point');
  });
});

import { describe, expect, test } from 'bun:test';

import { SUNWAY_PYRAMID } from '@/lib/location/fixtureLocationService';

import { row } from '../board/boardTestKit';
import { createFixtureBoardService, fixtureBoardOptions } from '../board/fixtureBoardService';
import { mapPins, type PinText } from './pins';

const t: PinText = (key, options) =>
  options ? `${key}|${options.title}|${options.reward}` : `name:${key}`;

const A = { latitude: 3.074, longitude: 101.608 };
const B = { latitude: 3.073, longitude: 101.611 };

const pins = (rows: Parameters<typeof mapPins>[0], theme: 'light' | 'dark' = 'light') =>
  mapPins(rows, t, 'zh-Hans', theme);

describe('mapPins', () => {
  test('rows without a point are dropped', () => {
    const result = pins([row('a', { point: A }), row('none'), row('b', { point: B })]);
    expect(result.map((pin) => pin.rowId)).toEqual(['a', 'b']);
  });

  test('rows on the same snapped point get fan indexes in row order', () => {
    const result = pins([
      row('a1', { point: A }),
      row('b1', { point: B }),
      row('a2', { point: { ...A } }),
      row('a3', { point: A }),
    ]);
    expect(result.map((pin) => [pin.id, pin.fan])).toEqual([
      ['a1', { index: 0, of: 3 }],
      ['b1', { index: 0, of: 1 }],
      ['a2', { index: 1, of: 3 }],
      ['a3', { index: 2, of: 3 }],
    ]);
  });

  test('label is the category name and the VoiceOver label reads title and reward', () => {
    const [pin] = pins([
      row('a', {
        point: A,
        category: 'buy',
        title: '帮我买杯奶茶',
        reward: { minor: 500, currency: 'MYR' },
      }),
    ]);
    expect(pin.label).toBe('name:bounty.category.buy');
    expect(pin.a11yLabel).toBe('bounty.board.map.pin|帮我买杯奶茶|RM\u00a05');
    expect(pin.point).toEqual(A);
  });

  test('art is the category sticker colour, ink and symbol', () => {
    const [light] = pins([row('a', { point: A, category: 'pickup' })]);
    expect(light.art).toEqual({
      color: '#C89B62',
      ink: '#25232B',
      symbol: 'tray.and.arrow.down.fill',
    });
    const [dark] = pins([row('a', { point: A, category: 'study' })], 'dark');
    expect(dark.art).toEqual({ color: '#F0C9DA', ink: '#25232B', symbol: 'book.fill' });
  });

  test('ids and the first page fan indexes stay stable when a page is appended', () => {
    const first = [row('a1', { point: A }), row('b1', { point: B })];
    const second = [
      row('a2', { point: A }),
      row('c1', { point: { latitude: 3.07, longitude: 101.6 } }),
    ];
    const before = pins(first);
    const after = pins([...first, ...second]);
    for (const pin of before) {
      const same = after.find((candidate) => candidate.id === pin.id);
      expect(same?.fan.index).toBe(pin.fan.index);
      expect(same?.rowId).toBe(pin.rowId);
    }
    expect(after.map((pin) => pin.id)).toEqual(['a1', 'b1', 'a2', 'c1']);
  });

  test('a row repeated across pages yields one pin', () => {
    const result = pins([row('a1', { point: A }), row('a1', { point: A })]);
    expect(result).toHaveLength(1);
    expect(result[0].fan).toEqual({ index: 0, of: 1 });
  });

  test('the crowded fixture fans six pins in one cell and keeps the four near ones apart', async () => {
    const service = createFixtureBoardService({
      ...fixtureBoardOptions((name) => (name === 'uiVerifyBoard' ? 'crowded' : undefined), 'demo'),
    });
    const page = await service.page({ kind: 'me', point: SUNWAY_PYRAMID }, 'all', null);
    const result = pins(page.items);
    expect(result).toHaveLength(10);
    expect(result.filter((pin) => pin.fan.of === 6)).toHaveLength(6);
    const single = result.filter((pin) => pin.fan.of === 1);
    expect(single).toHaveLength(4);
    expect(new Set(single.map((pin) => `${pin.point.latitude},${pin.point.longitude}`)).size).toBe(
      4,
    );
  });

  test('an applied pin wears the stamp and VoiceOver reads the applied state after the reward', () => {
    const [applied, open] = pins([
      row('a', { point: A, title: '帮取快递', appliedByMe: true }),
      row('b', { point: B }),
    ]);
    expect(applied.applied).toBe(true);
    expect(applied.a11yLabel).toBe(
      ['bounty.board.map.pin|帮取快递|RM\u00a08', 'name:bounty.board.card.applied'].join(
        'name:bounty.board.card.separator',
      ),
    );
    expect(applied.stamp).toEqual({ text: 'name:bounty.stamp', ink: '#187A50', fill: '#FFFFFF' });
    expect(open.applied).toBe(false);
    expect(open.a11yLabel).not.toContain('applied');
  });

  test('a held pin waits unstamped while VoiceOver already reads it as applied', () => {
    const [pin] = mapPins(
      [row('a', { point: A, appliedByMe: true })],
      t,
      'zh-Hans',
      'dark',
      new Set(['a']),
    );
    expect(pin.applied).toBe(false);
    expect(pin.a11yLabel).toContain('name:bounty.board.card.applied');
    expect(pin.stamp.ink).toBe('#3ECF8E');
  });
});

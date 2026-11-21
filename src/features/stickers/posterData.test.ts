import { describe, expect, test } from 'bun:test';

import type { Sticker } from '@/lib/stickers/model';

import { createBookFocus } from './bookFocus';
import { collage, nextBackground, posterCard, posterMonth } from './posterData';
import { monthInView, monthsBetween } from './monthInView';
import { parseShareTarget, monthParam } from './shareTarget';

const NAME = 'Nurul Aisyah binti Wan Abdul Rahman Shah';

const sticker = (id: string, earnedAt: Date, extra: Partial<Sticker> = {}): Sticker => ({
  id,
  paymentId: null,
  role: 'payee',
  itemKind: 'bounty',
  category: 'buy',
  art: null,
  title: `帮买奶茶 ${id}`,
  earnedAt: earnedAt.toISOString(),
  counterpartName: NAME,
  ...extra,
});

const october = { year: 2026, month: 9 };

describe('posters', () => {
  test('a card poster carries the art, the date and the title, never the counterpart', () => {
    const card = posterCard(sticker('a', new Date(2026, 9, 3, 12)));
    expect(card).toEqual({
      art: 'tea',
      earnedAt: new Date(2026, 9, 3, 12).toISOString(),
      title: '帮买奶茶 a',
    });
    expect(JSON.stringify(card)).not.toContain(NAME);
  });

  test('a month poster shows the newest art per day, counts every sticker and leaves names out', () => {
    const stickers = [
      sticker('ride', new Date(2026, 9, 24, 20), { itemKind: 'ride', category: null }),
      sticker('b', new Date(2026, 9, 24, 12)),
      sticker('c', new Date(2026, 9, 24, 9)),
      sticker('d', new Date(2026, 9, 1, 9)),
      sticker('e', new Date(2026, 8, 30, 9)),
    ];
    const month = posterMonth(stickers, october);
    expect(month.total).toBe(4);
    expect(month.days.get(24)).toEqual({ art: 'car', count: 3 });
    expect(month.days.get(1)).toEqual({ art: 'tea', count: 1 });
    expect(month.days.has(30)).toBe(false);
    expect(JSON.stringify([...month.days.values()])).not.toContain(NAME);
  });

  test('a month with every day done fills all 31 days', () => {
    const stickers = Array.from({ length: 31 }, (_, day) =>
      sticker(`${day}`, new Date(2026, 9, day + 1, 12)),
    );
    expect(posterMonth(stickers, october).days.size).toBe(31);
  });

  test('the collage reuses the user’s own arts, even when there is only one', () => {
    const one = collage(['tea']);
    expect(one.length).toBeGreaterThan(3);
    expect(new Set(one.map((piece) => piece.art))).toEqual(new Set(['tea']));
    expect(collage([])).toEqual([]);
    expect(new Set(collage(['tea', 'car', 'tea']).map((piece) => piece.art))).toEqual(
      new Set(['tea', 'car']),
    );
  });

  test('the background button cycles paper, tint and night', () => {
    expect(nextBackground('paper')).toBe('tint');
    expect(nextBackground('tint')).toBe('night');
    expect(nextBackground('night')).toBe('paper');
  });
});

describe('calendar sheet', () => {
  test('the share pill names the month that covers most of the view', () => {
    const spans = [
      { y: 0, height: 400 },
      { y: 400, height: 460 },
      { y: 860, height: 400 },
    ];
    expect(monthInView(spans, 0, 700)).toBe(0);
    expect(monthInView(spans, 300, 700)).toBe(1);
    expect(monthInView(spans, 820, 700)).toBe(2);
    expect(monthInView([undefined, { y: 400, height: 400 }], 0, 500)).toBe(1);
    expect(monthInView([], 0, 500)).toBe(-1);
  });

  test('months run from the first sticker’s month to this month, across a year', () => {
    expect(monthsBetween({ year: 2025, month: 11 }, { year: 2026, month: 1 })).toEqual([
      { year: 2025, month: 11 },
      { year: 2026, month: 0 },
      { year: 2026, month: 1 },
    ]);
  });

  test('a tapped day moves the open book to that card once', () => {
    const focus = createBookFocus();
    let heard = 0;
    focus.subscribe(() => heard++);
    focus.jumpTo('b');
    expect(heard).toBe(1);
    expect(focus.take()).toBe('b');
    expect(focus.take()).toBeNull();
  });
});

test('share routes name a card or a month and reject anything else', () => {
  expect(parseShareTarget('fixture-sticker-0', undefined)).toEqual({ card: 'fixture-sticker-0' });
  expect(parseShareTarget(undefined, monthParam(october))).toEqual({ month: october });
  expect(parseShareTarget(undefined, '2026-13')).toBeNull();
  expect(parseShareTarget(undefined, 'october')).toBeNull();
});

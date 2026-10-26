import { describe, expect, test } from 'bun:test';

import type { Sticker } from '@/lib/stickers';

import { createFixtureStickerService } from '@/lib/stickers/fixture';

import { createFixturePaymentService, FIXTURE_PAYMENT_IDS } from '../fixturePaymentService';
import { bookSlots, celebrationBody, confettiPieces, glyphs, targetSlot } from './model';
import { ease, keyframes, TIMELINE, TOTAL } from './timeline';

const earlier = (id: string): Sticker => ({
  id,
  paymentId: `p-${id}`,
  itemKind: 'bounty',
  category: null,
  title: id,
  earnedAt: '2026-10-01T00:00:00Z',
});

describe('book slots', () => {
  test('the first sticker lands in the first slot and the rest are empty outlines', () => {
    expect(bookSlots(1, []).map((slot) => slot.kind)).toEqual([
      'target',
      'empty',
      'empty',
      'empty',
      'empty',
      'empty',
    ]);
  });

  test('later stickers land after the most recent earlier ones, and the sixth slot holds every later one', () => {
    const slots = bookSlots(3, [earlier('b'), earlier('a')]);
    expect(slots.map((slot) => (slot.kind === 'sticker' ? slot.sticker.id : slot.kind))).toEqual([
      'b',
      'a',
      'target',
      'empty',
      'empty',
      'empty',
    ]);
    expect(targetSlot(8)).toBe(5);
  });

  test('earlier stickers that did not load show as filled slots, never as empty ones', () => {
    expect(bookSlots(3, null).map((slot) => slot.kind)).toEqual([
      'earlier',
      'earlier',
      'target',
      'empty',
      'empty',
      'empty',
    ]);
  });
});

describe('unknown sticker count', () => {
  test('claims no slot: earlier stickers stay, nothing is a target or an empty outline', () => {
    const slots = bookSlots(null, [earlier('b')]);
    expect(slots.map((slot) => slot.kind)).toEqual([
      'sticker',
      'earlier',
      'earlier',
      'earlier',
      'earlier',
      'earlier',
    ]);
  });

  test('the body never claims a number or a first, even on a first settle', () => {
    expect(celebrationBody(true, null)).toEqual({ key: 'pay.celebrate.unknownBody' });
    expect(celebrationBody(false, null)).toEqual({ key: 'pay.celebrate.unknownBody' });
    expect(celebrationBody(true, 1)).toEqual({ key: 'pay.celebrate.first.body' });
    expect(celebrationBody(false, 8)).toEqual({ key: 'pay.celebrate.routine.body', count: 8 });
  });
});

describe('amount and confetti', () => {
  test('digits roll and separators stay', () => {
    expect(glyphs('12,345')).toEqual([
      { kind: 'digit', digit: 1 },
      { kind: 'digit', digit: 2 },
      { kind: 'mark', text: ',' },
      { kind: 'digit', digit: 3 },
      { kind: 'digit', digit: 4 },
      { kind: 'digit', digit: 5 },
    ]);
  });

  test('16 confetti pieces on a first settle and 10 later, the same every time', () => {
    expect(confettiPieces(16)).toHaveLength(16);
    expect(confettiPieces(10)).toEqual(confettiPieces(10));
    expect(confettiPieces(16).every((piece) => piece.y2 > piece.y1)).toBe(true);
  });
});

describe('timeline', () => {
  test('curves start at 0, end at 1 and overshoot where the design asks', () => {
    expect(ease(TIMELINE.book.curve, 0)).toBe(0);
    expect(ease(TIMELINE.book.curve, 1)).toBe(1);
    const peak = Math.max(
      ...Array.from({ length: 99 }, (_, i) => ease(TIMELINE.book.curve, (i + 1) / 100)),
    );
    expect(peak).toBeGreaterThan(1);
    expect(ease([0.25, 0.1, 0.25, 1], 0.5)).toBeCloseTo(0.8024, 3);
  });

  test('keyframes hold before the start, follow each stop, and hold after the end', () => {
    const at = (t: number) => keyframes(t, 1000, 100, [0, 0.5, 1], [0, 10, 4]);
    expect(at(0)).toBe(0);
    expect(at(1050)).toBe(10);
    expect(at(1075)).toBeCloseTo(7);
    expect(at(5000)).toBe(4);
  });

  test('the sticker lands at 1020 ms and every part ends by the end of the clock', () => {
    expect(TIMELINE.flyX.start + TIMELINE.flyX.duration).toBe(TIMELINE.land);
    expect(TIMELINE.amountShine.start + TIMELINE.amountShine.duration).toBeLessThanOrEqual(TOTAL);
    expect(
      TIMELINE.digits.start + 8 * TIMELINE.digits.step + TIMELINE.digits.duration,
    ).toBeLessThanOrEqual(TOTAL);
  });
});

test('the fixture settle returns the sticker count the sticker book then lists', async () => {
  const stickers = createFixtureStickerService('seven');
  const payments = createFixturePaymentService({
    variant: 'demo',
    feed: undefined,
    mix: 'all',
    rate: true,
    earnSticker: stickers.earn,
  });
  expect(await payments.confirm(FIXTURE_PAYMENT_IDS.owedCash)).toEqual({
    firstSettled: false,
    stickerCount: 8,
  });
  const listed = await stickers.list('fixture-user');
  expect(listed).toHaveLength(8);
  expect(listed[0].paymentId).toBe(FIXTURE_PAYMENT_IDS.owedCash);
});

import { describe, expect, test } from 'bun:test';

import type { Sticker } from '@/lib/stickers';

import { createFixtureStickerService } from '@/lib/stickers/fixture';

import { createFixturePaymentService, FIXTURE_PAYMENT_IDS } from '../fixturePaymentService';
import {
  bookSlots,
  celebrationBody,
  confettiPieces,
  glyphs,
  groupDrop,
  groupLayout,
  groupPoint,
  shiftStart,
  targetSlot,
  type BookSlot,
} from './model';
import { ease, keyframes, TIMELINE, TOTAL } from './timeline';

const earlier = (id: string): Sticker => ({
  id,
  paymentId: `p-${id}`,
  role: 'payee',
  itemKind: 'bounty',
  category: null,
  art: null,
  title: id,
  earnedAt: '2026-10-01T00:00:00Z',
  counterpartName: null,
});

const describeSlot = (slot: BookSlot) =>
  slot.kind === 'sticker' || slot.kind === 'earlier'
    ? `${slot.kind === 'sticker' ? slot.sticker.id : 'earlier'}<${slot.from ?? '-'}${slot.arrives ? '!' : ''}`
    : slot.kind;

describe('book slots', () => {
  test('the first sticker lands in the first slot and nothing shifts', () => {
    expect(targetSlot(1)).toBe(0);
    expect(bookSlots(1, []).map(describeSlot)).toEqual([
      'target',
      'empty',
      'empty',
      'empty',
      'empty',
      'empty',
    ]);
  });

  test('a later sticker lands in the first slot and each earlier one shifts one slot forward', () => {
    expect(targetSlot(3)).toBe(0);
    expect(bookSlots(3, [earlier('b'), earlier('a')]).map(describeSlot)).toEqual([
      'target',
      'b<0',
      'a<1!',
      'empty',
      'empty',
      'empty',
    ]);
  });

  test('from the seventh sticker on, the five most recent fill slots 1 to 5 and the sixth leaves the page', () => {
    const previous = ['g', 'f', 'e', 'd', 'c', 'b', 'a'].map(earlier);
    expect(targetSlot(8)).toBe(0);
    expect(bookSlots(8, previous).map(describeSlot)).toEqual([
      'target',
      'g<0',
      'f<1',
      'e<2',
      'd<3',
      'c<4!',
    ]);
  });

  test('the last card of a row moves to the first slot of the next row', () => {
    const step = shiftStart(2, 3, 110, 94);
    expect(step).toEqual({ x: 220, y: -94 });
    expect(shiftStart(0, 1, 110, 94)).toEqual({ x: -110, y: 0 });
  });

  test('earlier stickers that did not load show as filled slots, never as empty ones', () => {
    expect(bookSlots(3, null).map(describeSlot)).toEqual([
      'target',
      'earlier<0',
      'earlier<1!',
      'empty',
      'empty',
      'empty',
    ]);
  });
});

describe('slot shift at other counts', () => {
  test('a second sticker shifts the only earlier one into slot 1', () => {
    expect(bookSlots(2, [earlier('a')]).map(describeSlot)).toEqual([
      'target',
      'a<0!',
      'empty',
      'empty',
      'empty',
      'empty',
    ]);
  });

  test('a sixth sticker shifts five earlier ones and nothing leaves', () => {
    const slots = bookSlots(6, ['e', 'd', 'c', 'b', 'a'].map(earlier));
    expect(slots.map(describeSlot)).toEqual(['target', 'e<0', 'd<1', 'c<2', 'b<3', 'a<4!']);
    expect(slots[5]).toMatchObject({ leaving: null });
  });

  test('a seventh sticker shifts five and fades out the sixth earlier one in the last slot', () => {
    const slots = bookSlots(7, ['f', 'e', 'd', 'c', 'b', 'a'].map(earlier));
    expect(slots.map(describeSlot)).toEqual(['target', 'f<0', 'e<1', 'd<2', 'c<3', 'b<4!']);
    expect(slots[5]).toMatchObject({ leaving: { kind: 'sticker', sticker: { id: 'a' } } });
    expect(bookSlots(7, null)[5]).toMatchObject({ leaving: { kind: 'earlier' } });
  });
});

const GAP = { ideal: 84.8, min: 76.8 };
const PANEL = 247;

describe('centred group', () => {
  test('on an iPhone 17 Pro the group keeps the full gap at full size', () => {
    const space = 874 - 62 - 154;
    expect(groupLayout(space, 250, PANEL, GAP)).toEqual({ gap: 84.8, height: 581.8, scale: 1 });
  });

  test('on a 667 pt iPhone SE the gap shrinks first, then the group scales to fit above the buttons', () => {
    const space = 667 - 20 - (16 + 46 + 4 + 46 + 8);
    expect(groupLayout(space, 190, PANEL, GAP)).toMatchObject({ gap: 84.8, scale: 1 });
    expect(groupLayout(space, 200, PANEL, GAP).gap).toBeCloseTo(80);
    for (const headline of [250, 300]) {
      const layout = groupLayout(space, headline, PANEL, GAP);
      expect(layout.gap).toBe(GAP.min);
      expect(layout.height * layout.scale).toBeCloseTo(space);
      expect(layout.scale).toBeGreaterThan(0.8);
    }
  });

  test('the panel starts at the bottom of the stage and the sticker targets the scaled slot', () => {
    const stage = { x: 0, y: 20, width: 375, height: 527 };
    const layout = groupLayout(stage.height, 300, PANEL, GAP);
    const bottom = groupPoint(stage, layout, 0, layout.height).y;
    expect(bottom + groupDrop(stage, layout) * layout.scale).toBeCloseTo(stage.y + stage.height);
    expect(groupPoint(stage, layout, 187.5, layout.height / 2)).toEqual({ x: 187.5, y: 283.5 });
    const roomy = groupLayout(658, 250, PANEL, GAP);
    expect(groupPoint({ x: 0, y: 62, width: 402, height: 658 }, roomy, 50, 0).y).toBeCloseTo(
      62 + (658 - 581.8) / 2,
    );
  });
});

describe('unknown sticker count', () => {
  test('claims no slot and shifts nothing: earlier stickers stay, nothing is a target or an empty outline', () => {
    expect(targetSlot(null)).toBeNull();
    expect(bookSlots(null, [earlier('b')]).map(describeSlot)).toEqual([
      'b<-',
      'earlier<-',
      'earlier<-',
      'earlier<-',
      'earlier<-',
      'earlier<-',
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
    expect(TIMELINE.converge.start + TIMELINE.converge.duration).toBe(TIMELINE.land);
    expect(TIMELINE.converge.curve).toEqual(TIMELINE.flyX.curve);
    expect(TIMELINE.shift.start + TIMELINE.shift.duration).toBeLessThan(TIMELINE.land);
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

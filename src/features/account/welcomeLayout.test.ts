import { describe, expect, test } from 'bun:test';

import { resources } from '@/lib/i18n/resources';
import { OBJECT_KINDS } from '@/ui/objectKinds';

import { heroBottom, POP_STAGGER, stickerExampleKey, welcomeLayout } from './welcomeLayout';

const SE = { width: 375, height: 667 };
const PRO = { width: 402, height: 874 };
const PANEL_ON_SE = 270;

function lookup(tree: object, key: string) {
  return key
    .split('.')
    .reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], tree);
}

describe('welcomeLayout', () => {
  test('a standard screen shows all seven stickers', () => {
    const layout = welcomeLayout(PRO);
    expect(layout.short).toBe(false);
    expect(layout.stickers.map((s) => s.kind)).toEqual([...OBJECT_KINDS]);
  });

  test('a short screen drops the car and the milk tea and lifts the hero', () => {
    const tall = welcomeLayout(PRO);
    const short = welcomeLayout(SE);
    expect(short.short).toBe(true);
    expect(short.stickers.map((s) => s.kind)).toEqual([
      'parcel',
      'coffee',
      'ticket',
      'books',
      'umbrella',
    ]);
    expect(short.mascotTop).toBeLessThan(tall.mascotTop);
    expect(short.wordmarkTop).toBeLessThan(tall.wordmarkTop);
    expect(short.bubble.y).toBeLessThan(tall.bubble.y);
  });

  test('nothing on a short screen sits under the sign-in panel', () => {
    expect(heroBottom(welcomeLayout(SE))).toBeLessThanOrEqual(SE.height - PANEL_ON_SE);
  });

  test('the 700 pt boundary is the first standard height', () => {
    expect(welcomeLayout({ width: 375, height: 699 }).short).toBe(true);
    expect(welcomeLayout({ width: 375, height: 700 }).short).toBe(false);
  });

  test('stickers pop in 70 ms apart and stay inside the screen width', () => {
    for (const size of [SE, PRO]) {
      const { stickers } = welcomeLayout(size);
      stickers.forEach((sticker, index) => {
        expect(sticker.delay).toBe(index * POP_STAGGER);
        expect(sticker.x).toBeGreaterThanOrEqual(0);
        expect(sticker.x + sticker.width).toBeLessThanOrEqual(size.width);
      });
    }
  });

  test('drift stays within 7 pt and 1.5 degrees on a 6 to 8 s loop', () => {
    for (const { drift } of welcomeLayout(PRO).stickers) {
      expect(Math.hypot(drift.x, drift.y)).toBeLessThanOrEqual(7);
      expect(Math.abs(drift.rotate)).toBeLessThanOrEqual(1.5);
      expect(drift.period).toBeGreaterThanOrEqual(6000);
      expect(drift.period).toBeLessThanOrEqual(8000);
    }
  });
});

describe('sticker examples', () => {
  test.each(Object.keys(resources))('every sticker has its own example in %s', (code) => {
    const translation = resources[code as keyof typeof resources].translation;
    const examples = OBJECT_KINDS.map((kind) => lookup(translation, stickerExampleKey(kind)));
    for (const example of examples)
      expect(typeof example === 'string' && example.length > 0).toBe(true);
    expect(new Set(examples).size).toBe(OBJECT_KINDS.length);
  });

  test('the parcel example matches the design copy', () => {
    expect(lookup(resources['zh-Hans'].translation, stickerExampleKey('parcel'))).toBe(
      '帮取快递 · RM 8',
    );
  });
});

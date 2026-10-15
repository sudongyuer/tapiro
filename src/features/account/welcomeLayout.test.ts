import { describe, expect, test } from 'bun:test';

import { resources } from '@/lib/i18n/resources';
import { OBJECT_KINDS } from '@/ui/objectKinds';

import { heroBottom, POP_STAGGER, stickerExampleKey, welcomeLayout } from './welcomeLayout';

const PRO_PANEL = { 'zh-Hans': 273, ms: 311 };
const SE_BOTTOM_PADDING_SAVING = 34 - 20;
const WRAP_ALLOWANCE = 40;
const SE_PANELS = Object.values(PRO_PANEL).map(
  (panel) => panel - SE_BOTTOM_PADDING_SAVING + WRAP_ALLOWANCE,
);
const SE = { width: 375, height: 667, panelHeight: SE_PANELS[0], topInset: 20 };
const PRO = { width: 402, height: 874, panelHeight: PRO_PANEL.ms, topInset: 62 };
const MARGIN = 12;

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
    const kinds = short.stickers.map((s) => s.kind);
    expect(kinds).not.toContain('car');
    expect(kinds).not.toContain('boba');
    expect(kinds).toEqual(expect.arrayContaining(['parcel', 'coffee', 'ticket', 'books']));
    expect(short.mascotTop).toBeLessThan(tall.mascotTop);
    expect(short.wordmarkTop).toBeLessThan(tall.wordmarkTop);
    expect(short.bubble.y).toBeLessThan(tall.bubble.y);
  });

  test.each(SE_PANELS)('nothing on a short screen sits under a %d pt panel', (panelHeight) => {
    const layout = welcomeLayout({ ...SE, panelHeight });
    expect(heroBottom(layout)).toBeLessThanOrEqual(SE.height - panelHeight - MARGIN);
    expect(layout.mascotTop).toBeGreaterThanOrEqual(SE.topInset);
    expect(layout.mascotSize).toBeGreaterThanOrEqual(160);
  });

  test('the Malay panel on a short screen lifts the hero past the umbrella and drops it', () => {
    const layout = welcomeLayout({ ...SE, panelHeight: SE_PANELS[1] });
    expect(layout.stickers.map((s) => s.kind)).toEqual(['parcel', 'coffee', 'ticket', 'books']);
  });

  test('a standard screen keeps the design positions in both locales', () => {
    for (const panelHeight of Object.values(PRO_PANEL)) {
      const layout = welcomeLayout({ ...PRO, panelHeight });
      expect(layout.mascotTop).toBe(168);
      expect(layout.wordmarkTop).toBe(368);
      expect(heroBottom(layout)).toBeLessThanOrEqual(PRO.height - panelHeight - MARGIN);
    }
  });

  test('a panel that would cover the low stickers drops them on a tall screen too', () => {
    const layout = welcomeLayout({ ...PRO, panelHeight: 420 });
    expect(layout.short).toBe(true);
    expect(heroBottom(layout)).toBeLessThanOrEqual(PRO.height - 420 - MARGIN);
  });

  test('the bubble stops before the books sticker', () => {
    const layout = welcomeLayout(PRO);
    const books = layout.stickers.find((s) => s.kind === 'books')!;
    expect(layout.bubble.maxRight).toBeLessThan(books.x);
  });

  test('the 700 pt boundary is the first standard height', () => {
    expect(welcomeLayout({ ...SE, height: 699, panelHeight: 100 }).short).toBe(true);
    expect(welcomeLayout({ ...SE, height: 700, panelHeight: 100 }).short).toBe(false);
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

import { describe, expect, test } from 'bun:test';
import { createInstance } from 'i18next';

import { resources } from '@/lib/i18n/resources';

import { markLabel, needsScroll, scrollTarget } from './axisFocus';
import type { BoardRow } from './types';

function translator(lng: string) {
  const i18n = createInstance();
  i18n.init({ resources, lng, initAsync: false, interpolation: { escapeValue: false } });
  return i18n.t;
}

const row = (title: string, distanceM: number): BoardRow => ({
  id: title,
  title,
  category: 'move',
  rewardSen: 800,
  placeLabel: 'Sunway',
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

describe('markLabel', () => {
  test('one bounty reads its title and distance', () => {
    expect(markLabel([row('搬两个箱子上楼', 1600)], translator('zh-Hans'), 'zh-Hans')).toBe(
      '搬两个箱子上楼，1.6\u00a0km',
    );
  });

  test('a merged mark lists every title and the distance range', () => {
    const rows = [row('帮取快递', 300), row('帮我买杯奶茶', 500)];
    expect(markLabel(rows, translator('zh-Hans'), 'zh-Hans')).toBe(
      '帮取快递、帮我买杯奶茶，300\u00a0m 到 500\u00a0m',
    );
    expect(markLabel(rows, translator('en'), 'en')).toBe(
      '帮取快递; 帮我买杯奶茶, 300\u00a0m to 500\u00a0m',
    );
  });

  test('a merged mark at one distance reads that distance once', () => {
    const rows = [row('A', 700), row('B', 700)];
    expect(markLabel(rows, translator('ms'), 'ms')).toBe('A; B, 700\u00a0m');
  });
});

describe('scrollTarget', () => {
  test('puts the card under the top chrome', () => {
    expect(
      scrollTarget({ cardY: 900, topInset: 160, contentHeight: 3000, viewportHeight: 874 }),
    ).toBe(740);
  });

  test('never scrolls past the end of the content', () => {
    expect(
      scrollTarget({ cardY: 2900, topInset: 160, contentHeight: 3000, viewportHeight: 874 }),
    ).toBe(2126);
  });

  test('content shorter than the screen does not push the target below zero', () => {
    expect(
      scrollTarget({ cardY: 500, topInset: 160, contentHeight: 600, viewportHeight: 874 }),
    ).toBe(0);
  });
});

describe('needsScroll', () => {
  test('a target within a point of the offset needs no scroll, so the ring shows at once', () => {
    expect(needsScroll(740, 740.4)).toBe(false);
    expect(needsScroll(740, 700)).toBe(true);
    expect(needsScroll(740, null)).toBe(true);
  });
});

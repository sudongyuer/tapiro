import { describe, expect, test } from 'bun:test';
import { createInstance } from 'i18next';

import { LANGUAGES } from '@/lib/i18n/languages';
import { resources } from '@/lib/i18n/resources';

import { cardCopy } from './cardCopy';
import type { BoardRow } from './types';

const NOW = new Date(2026, 9, 27, 15, 0);
const at = (hour: number, minute = 0) => new Date(2026, 9, 27, hour, minute).toISOString();

const ROW: BoardRow = {
  id: 'b1',
  title: '帮取快递',
  category: 'pickup',
  reward: { minor: 800, currency: 'MYR' },
  reference: null,
  placeLabel: 'Sunway Geo 宿舍',
  stickerPath: null,
  startsAt: null,
  endsAt: null,
  deadlineAt: at(16),
  urgent: true,
  distanceM: 300,
  appliedByMe: false,
  createdAt: at(14),
  poster: { id: 'p1', name: '小林', tier: 'reliable' },
};

function translator(lng: string) {
  const i18n = createInstance();
  i18n.init({ resources, lng, initAsync: false, interpolation: { escapeValue: false } });
  return i18n.t;
}

const t = translator('zh-Hans');
const RM8 = 'RM\u00a08';

describe('cardCopy', () => {
  test('marks an urgent row with 急 before its deadline and joins place and distance', () => {
    const copy = cardCopy(ROW, t, 'zh-Hans', NOW);
    expect(copy.when).toBe('急 · 今天 16:00 前');
    expect(copy.place).toBe('Sunway Geo 宿舍\u00a0·\u00a0300\u00a0m');
    expect(copy.reward).toMatch(/^RM\s8$/);
    expect(copy.initial).toBe('林');
    expect(copy.tier).toBe('靠谱');
    expect(copy.rank).toBe(2);
    expect(copy.label).toBe(
      `代取，帮取快递，赏金 ${RM8}，急，今天 16:00 前，Sunway Geo 宿舍，300\u00a0m，小林，靠谱`,
    );
  });

  test('shows a window without 急, and the place alone when there is no distance', () => {
    const copy = cardCopy(
      {
        ...ROW,
        urgent: false,
        deadlineAt: null,
        startsAt: at(18),
        endsAt: at(19),
        distanceM: null,
      },
      t,
      'zh-Hans',
      NOW,
    );
    expect(copy.when).toBe('今天 18:00 – 19:00');
    expect(copy.place).toBe('Sunway Geo 宿舍');
    expect(copy.label).not.toContain('急');
  });

  test('says 没写地点 without a place, and nothing about time without one', () => {
    const copy = cardCopy(
      { ...ROW, urgent: false, deadlineAt: null, placeLabel: null, distanceM: null },
      t,
      'zh-Hans',
      NOW,
    );
    expect(copy.when).toBeNull();
    expect(copy.place).toBe('没写地点');
    expect(copy.label).toBe(`代取，帮取快递，赏金 ${RM8}，没写地点，小林，靠谱`);
  });

  test('ends the spoken label with the application and names an unnamed poster', () => {
    const copy = cardCopy(
      { ...ROW, appliedByMe: true, poster: { id: 'p2', name: null, tier: 'tapir_friend' } },
      t,
      'zh-Hans',
      NOW,
    );
    expect(copy.name).toBe('对方');
    expect(copy.rank).toBe(4);
    expect(copy.label).toEndWith('对方，貘友，已申请，等对方选');
  });

  test.each(LANGUAGES.map((language) => language.code))('%s fills every part', (code) => {
    const copy = cardCopy({ ...ROW, appliedByMe: true }, translator(code), code, NOW);
    for (const text of [copy.category, copy.when, copy.place, copy.tier, copy.label]) {
      expect(text).not.toContain('bounty.');
      expect(text).not.toContain('{{');
    }
  });
});

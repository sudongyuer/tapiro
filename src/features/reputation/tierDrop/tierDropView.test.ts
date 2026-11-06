import { describe, expect, test } from 'bun:test';
import { createInstance } from 'i18next';

import { resources } from '@/lib/i18n/resources';

import type { TierDrop } from '../types';
import { noShowDate, tierDropCanShow, tierDropLines } from './tierDropView';

function translator(lng: string) {
  const i18n = createInstance();
  i18n.init({ resources, lng, initAsync: false, interpolation: { escapeValue: false } });
  return i18n.t.bind(i18n);
}

const AT = '2026-06-02T04:00:00Z';

const drop = (overrides: Partial<TierDrop> = {}): TierDrop => ({
  id: 1,
  from: 'very_reliable',
  to: 'reliable',
  droppedAt: '2026-11-06T00:00:00Z',
  noShows: [{ at: AT, kind: 'bounty', title: '帮取快递' }],
  noShowCount: 1,
  negativeReviews: 0,
  settled: 8,
  people: 4,
  toRegain: { tier: 'very_reliable', settled: 2, newPeople: 1, goodReviews: 0 },
  ...overrides,
});

describe('tierDropLines', () => {
  test('reads the drawn zh-Hans sheet for one no-show', () => {
    const lines = tierDropLines(drop(), translator('zh-Hans'), 'zh-Hans');
    const date = noShowDate(AT, 'zh-Hans');
    expect(lines.title).toBe('靠谱度变成了「靠谱」');
    expect(lines.reasons).toEqual([`近 180 天里有 1 次没到（${date} · 帮取快递）。`]);
    expect(lines.wayBack).toBe('再顺利完成 2 次、帮到 1 个新的人，就能回到「很靠谱」。');
  });

  test('reads the drawn en and ms way back', () => {
    expect(tierDropLines(drop(), translator('en'), 'en').wayBack).toBe(
      'Finish 2 more smoothly and help 1 new person to get back to Very Reliable.',
    );
    expect(tierDropLines(drop(), translator('ms'), 'ms').wayBack).toBe(
      'Selesaikan 2 lagi dengan lancar dan bantu 1 orang baharu untuk kembali ke Sangat Boleh Diharap.',
    );
  });

  test('names negative reviews alone, or after the no-shows', () => {
    const t = translator('zh-Hans');
    const reviewsOnly = drop({ noShows: [], noShowCount: 0, negativeReviews: 3 });
    expect(tierDropLines(reviewsOnly, t, 'zh-Hans').reasons).toEqual([
      '近 180 天里有 3 条评价提到了没做好的地方。',
    ]);
    const both = tierDropLines(drop({ negativeReviews: 2 }), t, 'zh-Hans').reasons;
    expect(both).toHaveLength(2);
    expect(both[1]).toBe('还有 2 条评价提到了没做好的地方。');
  });

  test('lists every listed no-show and falls back to the kind without a title', () => {
    const t = translator('en');
    const lines = tierDropLines(
      drop({
        noShows: [
          { at: AT, kind: 'bounty', title: 'Pick up a parcel' },
          { at: AT, kind: 'ride', title: null },
        ],
        noShowCount: 4,
      }),
      t,
      'en',
    );
    const date = noShowDate(AT, 'en');
    expect(lines.reasons[0]).toBe(
      `In the last 180 days you missed 4 (${date} · Pick up a parcel; ${date} · Carpool).`,
    );
  });

  test('a count without listed no-shows has no empty brackets', () => {
    const lines = tierDropLines(drop({ noShows: [] }), translator('zh-Hans'), 'zh-Hans');
    expect(lines.reasons).toEqual(['近 180 天里有 1 次没到。']);
  });

  test('without a no-show or a review the reason names the tier that was lost, with no counts', () => {
    const lines = tierDropLines(drop({ noShows: [], noShowCount: 0 }), translator('en'), 'en');
    expect(lines.reasons).toEqual([
      'In the last 180 days, what you finished and the people you helped fell short of Very Reliable.',
    ]);
  });

  test('joins three steps and capitalises the first one that is left', () => {
    const regain = { tier: 'very_reliable', settled: 2, newPeople: 3, goodReviews: 4 } as const;
    expect(tierDropLines(drop({ toRegain: regain }), translator('en'), 'en').wayBack).toBe(
      'Finish 2 more smoothly, help 3 new people and get 4 more good reviews to get back to Very Reliable.',
    );
    const reviewsOnly = { ...regain, settled: 0, newPeople: 0, goodReviews: 1 };
    expect(tierDropLines(drop({ toRegain: reviewsOnly }), translator('en'), 'en').wayBack).toBe(
      'Get 1 more good review to get back to Very Reliable.',
    );
  });

  test('nothing left to do reads as keep going', () => {
    const regain = { tier: 'very_reliable', settled: 0, newPeople: 0, goodReviews: 0 } as const;
    expect(
      tierDropLines(drop({ toRegain: regain }), translator('zh-Hans'), 'zh-Hans').wayBack,
    ).toBe('之后一直顺利完成，就能回到「很靠谱」。');
  });
});

describe('tierDropCanShow', () => {
  test('opens over a tab screen, pushed or not', () => {
    expect(tierDropCanShow(['(tabs)', 'bounty'])).toBe(true);
    expect(tierDropCanShow(['(tabs)', 'bounty', 'profile', '[id]'])).toBe(true);
  });

  test('waits while a sheet is open in a tab or at the root', () => {
    expect(tierDropCanShow(['(tabs)', 'messages', 'report'])).toBe(false);
    expect(tierDropCanShow(['(tabs)', 'me', 'profile', 'reply'])).toBe(false);
    expect(tierDropCanShow(['pay', '[id]'])).toBe(false);
    expect(tierDropCanShow(['tier-drop'])).toBe(false);
  });
});

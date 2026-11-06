import { describe, expect, test } from 'bun:test';
import { createInstance } from 'i18next';

import { resources } from '@/lib/i18n/resources';

import type { ProfileCard, ProfileReview } from '../types';
import {
  canReply,
  levelProgress,
  rateText,
  reviewLabel,
  reviewLine,
  reviewQuote,
  reviewSource,
  showsAllReviews,
} from './profileView';

const i18n = createInstance();
i18n.init({ resources, lng: 'zh-Hans', initAsync: false, interpolation: { escapeValue: false } });
const t = i18n.t.bind(i18n);

const review = (overrides: Partial<ProfileReview> = {}): ProfileReview => ({
  reviewerBlockedByMe: false,
  reportable: true,
  id: 'r1',
  face: 'unhappy',
  chips: ['late', 'no_heads_up'],
  sentence: '等了 40 分钟',
  submittedAt: '2026-11-01T00:00:00Z',
  shownAt: '2026-11-02T00:00:00Z',
  reply: null,
  kind: 'bounty',
  role: 'helper',
  title: '帮取快递',
  reviewer: { id: 'p', name: '小林', avatarUrl: null },
  ...overrides,
});

const card = (overrides: Partial<ProfileCard> = {}): ProfileCard => ({
  id: 'mei',
  name: 'Mei',
  avatarUrl: null,
  joinedAt: '2026-01-01T00:00:00Z',
  self: false,
  blockedByMe: false,
  tier: 'very_reliable',
  helped: 9,
  settled: 25,
  completionRate: 0.96,
  reviewCount: 3,
  faces: { happy: 2, okay: 0, unhappy: 1 },
  latestReviews: [review(), review({ id: 'r2' }), review({ id: 'r3' })],
  mascot: { level: 4, stickers: 23, accessory: 'umbrella' },
  ...overrides,
});

describe('profile view', () => {
  test('a ride review the server stripped reads as 拼车 with no route or reviewer', () => {
    const ride = review({ kind: 'ride', role: 'rider', title: null, reviewer: null });
    expect(reviewSource(ride, t)).toBe('拼车');
    expect(reviewSource(review(), t)).toBe('小林 · 帮取快递');
  });

  test('a ride review the reviewee sees keeps its route and reviewer', () => {
    const ride = review({ kind: 'ride', role: 'rider', title: '双威 → KLIA2' });
    expect(reviewSource(ride, t)).toBe('小林 · 双威 → KLIA2');
  });

  test('chips read in the reviewee role and unknown chips are dropped', () => {
    expect(reviewLine(review({ chips: ['late', 'gone_chip'] }), t)).toBe('不开心 · 迟到');
    expect(reviewLine(review({ face: 'happy', role: 'rider', chips: ['on_time'] }), t)).toBe(
      '开心 · 准时到',
    );
  });

  test('VoiceOver hears the reply with whose it is', () => {
    const replied = review({ reply: { body: '电梯坏了', createdAt: '2026-11-03T00:00:00Z' } });
    expect(reviewLabel(replied, 'Mei', false, t)).toContain('Mei回复：电梯坏了');
    expect(reviewLabel(replied, 'Mei', true, t)).toContain('我的回复：电梯坏了');
  });

  test('only the owner replies, and only once', () => {
    expect(canReply(card({ self: true }), review())).toBe(true);
    expect(canReply(card({ self: false }), review())).toBe(false);
    const replied = review({ reply: { body: '谢谢', createdAt: '2026-11-03T00:00:00Z' } });
    expect(canReply(card({ self: true }), replied)).toBe(false);
  });

  test('全部评价 shows only when there are more than the latest rows', () => {
    expect(showsAllReviews(card())).toBe(false);
    expect(showsAllReviews(card({ reviewCount: 128 }))).toBe(true);
  });

  test('the report sheet quotes the face, the chips and the sentence, and no reviewer', () => {
    const quoted = review({ face: 'unhappy', chips: ['late'], sentence: '等了很久' });
    expect(reviewQuote(quoted, t)).toBe(`${reviewLine(quoted, t)}\n等了很久`);
    expect(reviewQuote(quoted, t)).not.toContain('小林');
    expect(reviewQuote(review({ sentence: null }), t)).toBe(reviewLine(review(), t));
  });

  test('the completion rate is a whole percent and absent before five items', () => {
    expect(rateText(0.964, 'zh-Hans')).toBe('96%');
    expect(rateText(null, 'zh-Hans')).toBeNull();
  });

  test('level progress counts the stickers left to the next level', () => {
    expect(levelProgress(4, 23)).toEqual({ next: 5, toGo: 2, fraction: 0.8 });
    expect(levelProgress(1, 0)).toEqual({ next: 2, toGo: 3, fraction: 0 });
    expect(levelProgress(85, 1234)).toEqual({ next: 86, toGo: 6, fraction: 0.6 });
  });
});

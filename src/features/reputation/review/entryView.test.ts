import { describe, expect, test } from 'bun:test';
import type { TFunction } from 'i18next';

import type { MyReview, PendingReview, Review, ReviewPair } from '../types';
import { pendingLine, reviewEntry, stillOpen } from './entryView';

const t = ((key: string, values?: Record<string, unknown>) =>
  values ? `${key} ${JSON.stringify(values)}` : key) as unknown as TFunction;

const now = new Date('2026-11-06T04:00:00.000Z');

const pair: ReviewPair = {
  kind: 'bounty',
  itemId: 'b1',
  counterpart: { id: 'p1', name: '小林', avatarUrl: null },
  role: 'helper',
  closesAt: '2026-11-11T03:00:00.000Z',
  state: 'open',
  theyReviewed: false,
  mine: null,
  theirs: null,
};

const mine: MyReview = {
  id: 'r1',
  face: 'happy',
  chips: [],
  sentence: null,
  submittedAt: '2026-11-06T04:00:00.000Z',
  shownAt: null,
  reply: null,
  editable: true,
};

const theirs: Review = { ...mine, id: 'r2', face: 'okay' };

describe('a review entry', () => {
  test('open: 评价 name with the days left, and it opens the sheet', () => {
    const entry = reviewEntry(pair, now, t);
    expect(entry.title).toContain('reputation.entry.review');
    expect(entry.trailing).toContain('"count":5');
    expect(entry.detail).toBeNull();
    expect(entry.target).toEqual({ kind: 'bounty', itemId: 'b1', reviewee: 'p1' });
  });

  test('open after they reviewed: says so, never what they wrote', () => {
    const entry = reviewEntry({ ...pair, theyReviewed: true }, now, t);
    expect(entry.detail).toContain('reputation.entry.sealedTheirs');
    expect(entry.detail).toContain('"count":5');
    expect(entry.trailing).toBeNull();
  });

  test('sealed: 已评价, waiting line, 改一下 opens the sheet', () => {
    const entry = reviewEntry({ ...pair, state: 'sealed', mine }, now, t);
    expect(entry.title).toBe('reputation.entry.reviewed');
    expect(entry.detail).toContain('reputation.entry.sealedMine');
    expect(entry.trailing).toBe('reputation.entry.edit');
    expect(entry.target).not.toBeNull();
  });

  test('sealed but no longer editable offers no edit', () => {
    const entry = reviewEntry(
      { ...pair, state: 'sealed', mine: { ...mine, editable: false } },
      now,
      t,
    );
    expect(entry.trailing).toBeNull();
    expect(entry.target).toBeNull();
  });

  test('revealed: names their face and does not open', () => {
    const entry = reviewEntry({ ...pair, state: 'revealed', mine, theirs }, now, t);
    expect(entry.title).toBe('reputation.entry.public');
    expect(entry.detail).toContain('reputation.entry.publicDetail');
    expect(entry.target).toBeNull();
  });

  test('ended: 评价已结束 with the name, and it does not open', () => {
    const entry = reviewEntry({ ...pair, state: 'ended' }, now, t);
    expect(entry.title).toBe('reputation.entry.ended');
    expect(entry.detail).toBe('小林');
    expect(entry.target).toBeNull();
  });

  test('VoiceOver reads every part of the row', () => {
    const entry = reviewEntry({ ...pair, state: 'sealed', mine }, now, t);
    expect(entry.label).toContain('reputation.entry.reviewed');
    expect(entry.label).toContain('reputation.entry.sealedMine');
    expect(entry.label).toContain('reputation.entry.edit');
  });
});

describe('a home card', () => {
  const row: PendingReview = {
    kind: 'bounty',
    itemId: 'b1',
    title: '帮取快递',
    counterpart: pair.counterpart,
    role: 'helper',
    closesAt: pair.closesAt,
    theyReviewed: false,
  };

  test('says who did what by the other side’s role', () => {
    expect(pendingLine(row, '小林', t)).toContain('reputation.home.helpedYou');
    expect(pendingLine({ ...row, role: 'poster' }, '小林', t)).toContain(
      'reputation.home.helpedThem',
    );
    expect(pendingLine({ ...row, role: 'rider' }, '小林', t)).toContain('reputation.home.rode');
    expect(pendingLine({ ...row, role: 'organiser' }, '小林', t)).toContain('reputation.home.rode');
  });

  test('goes away when the window ends', () => {
    expect(stillOpen(row, now)).toBe(true);
    expect(stillOpen({ ...row, closesAt: '2026-11-06T03:59:00.000Z' }, now)).toBe(false);
  });
});

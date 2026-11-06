import { describe, expect, test } from 'bun:test';

import { draftFromReview, EMPTY_DRAFT } from '../model';
import type { MyReview, ReviewDraft, ReviewPair } from '../types';
import { blockedBy, canSend, findPair, sheetSubtitle } from './reviewView';

const pair: ReviewPair = {
  kind: 'bounty',
  itemId: 'b1',
  counterpart: { id: 'p1', name: '小林', avatarUrl: null },
  role: 'helper',
  closesAt: '2026-11-13T04:00:00.000Z',
  state: 'open',
  theyReviewed: false,
  mine: null,
  theirs: null,
};

const mine: MyReview = {
  id: 'r1',
  face: 'happy',
  chips: ['on_time'],
  sentence: null,
  submittedAt: '2026-11-06T04:00:00.000Z',
  shownAt: null,
  reply: null,
  editable: true,
};

const inWindow = new Date('2026-11-07T04:00:00.000Z');
const afterWindow = new Date('2026-11-14T04:00:00.000Z');

const happy: ReviewDraft = { face: 'happy', chips: [], sentence: '' };

describe('the review sheet', () => {
  test('shows the item and the day the review window opened', () => {
    expect(sheetSubtitle('帮取快递', pair, 'en')).toBe('帮取快递 · 6 Nov');
    expect(sheetSubtitle(null, pair, 'en')).toBe('6 Nov');
  });

  test('needs a face before it can send', () => {
    expect(canSend(EMPTY_DRAFT, EMPTY_DRAFT, pair)).toBe(false);
    expect(canSend(happy, EMPTY_DRAFT, pair)).toBe(true);
  });

  test('refuses a sentence over 200 characters', () => {
    expect(canSend({ ...happy, sentence: '好'.repeat(200) }, EMPTY_DRAFT, pair)).toBe(true);
    expect(canSend({ ...happy, sentence: '好'.repeat(201) }, EMPTY_DRAFT, pair)).toBe(false);
  });

  test('an edit sends only after something changed', () => {
    const sealed: ReviewPair = { ...pair, state: 'sealed', mine };
    const base = draftFromReview(sealed);
    expect(canSend(base, base, sealed)).toBe(false);
    expect(canSend({ ...base, chips: [] }, base, sealed)).toBe(true);
  });

  test('says why a pair no longer takes a review', () => {
    expect(blockedBy(pair, inWindow)).toBeNull();
    expect(blockedBy({ ...pair, state: 'sealed', mine }, inWindow)).toBeNull();
    expect(
      blockedBy({ ...pair, state: 'sealed', mine: { ...mine, editable: false } }, inWindow),
    ).toBe('locked');
    expect(blockedBy({ ...pair, state: 'revealed' }, inWindow)).toBe('locked');
    expect(blockedBy({ ...pair, state: 'ended' }, inWindow)).toBe('closed');
  });

  test('a window that passed on the device clock is over before any read says so', () => {
    expect(blockedBy(pair, afterWindow)).toBe('closed');
    expect(blockedBy({ ...pair, state: 'sealed', mine }, afterWindow)).toBe('locked');
  });

  test('finds the pair of the person reviewed', () => {
    const target = { kind: 'bounty', itemId: 'b1', reviewee: 'p1' } as const;
    expect(findPair([pair], target)).toBe(pair);
    expect(findPair([], target)).toBeNull();
    expect(findPair([{ ...pair, counterpart: null }], target)).toBeNull();
  });
});

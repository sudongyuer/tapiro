import { describe, expect, test } from 'bun:test';

import {
  toMyMascot,
  toPendingReviews,
  toProfileCard,
  toReviewPage,
  toReviewPairs,
  toTierDrop,
} from './parse';

const PERSON = { id: 'p1', name: '小林', avatarUrl: null };

const REVIEW = {
  id: 'r1',
  face: 'happy',
  chips: ['on_time', 'careful'],
  sentence: '谢谢',
  submittedAt: '2026-11-06T01:00:00.123456+00:00',
  shownAt: null,
  reply: null,
};

const PAIR = {
  kind: 'bounty',
  itemId: 'b1',
  counterpart: PERSON,
  role: 'helper',
  closesAt: '2026-11-13T01:00:00+00:00',
  state: 'sealed',
  theyReviewed: false,
  mine: { ...REVIEW, editable: true },
  theirs: null,
};

const PROFILE = {
  id: 'p1',
  name: 'Mei',
  avatarUrl: null,
  joinedAt: '2026-05-01T00:00:00+00:00',
  self: false,
  blockedByMe: false,
  tier: 'very_reliable',
  helped: 9,
  settled: 25,
  completionRate: 0.96,
  reviewCount: 2,
  faces: { happy: 1, okay: 0, unhappy: 1 },
  latestReviews: [
    {
      ...REVIEW,
      shownAt: '2026-11-06T02:00:00+00:00',
      reply: { body: '谢谢你', createdAt: '2026-11-06T03:00:00+00:00' },
      kind: 'bounty',
      role: 'helper',
      title: '帮取快递',
      reviewer: PERSON,
      reviewerBlockedByMe: true,
      reportable: true,
    },
    {
      ...REVIEW,
      id: 'r2',
      face: 'unhappy',
      chips: ['late'],
      sentence: null,
      shownAt: '2026-11-05T02:00:00+00:00',
      kind: 'ride',
      role: 'rider',
      title: null,
      reviewer: null,
      reviewerBlockedByMe: false,
      reportable: false,
    },
  ],
  mascot: { level: 4, stickers: 23, accessory: 'umbrella' },
};

describe('reputation parsing', () => {
  test('a review pair keeps my review and hides theirs while sealed', () => {
    const [pair] = toReviewPairs([PAIR]);
    expect(pair.state).toBe('sealed');
    expect(pair.mine).toEqual({ ...REVIEW, face: 'happy', editable: true });
    expect(pair.theirs).toBeNull();
  });

  test('an unknown state, face or role is refused rather than guessed', () => {
    expect(() => toReviewPairs([{ ...PAIR, state: 'hidden' }])).toThrow();
    expect(() => toReviewPairs([{ ...PAIR, role: 'driver' }])).toThrow();
    expect(() => toReviewPairs([{ ...PAIR, mine: { ...PAIR.mine, face: 'meh' } }])).toThrow();
    expect(() => toReviewPairs(null)).toThrow();
  });

  test('the pending list parses each row', () => {
    const rows = toPendingReviews([
      {
        kind: 'ride',
        itemId: 'r1',
        title: '双威 → KLIA2',
        counterpart: PERSON,
        role: 'organiser',
        closesAt: '2026-11-13T01:00:00+00:00',
        theyReviewed: true,
      },
    ]);
    expect(rows).toEqual([
      {
        kind: 'ride',
        itemId: 'r1',
        title: '双威 → KLIA2',
        counterpart: PERSON,
        role: 'organiser',
        closesAt: '2026-11-13T01:00:00+00:00',
        theyReviewed: true,
      },
    ]);
    expect(toPendingReviews([])).toEqual([]);
  });

  test('a profile keeps a ride review without route or reviewer, and a hidden completion rate', () => {
    const card = toProfileCard(PROFILE);
    expect(card.latestReviews[1]).toMatchObject({
      kind: 'ride',
      title: null,
      reviewer: null,
      reportable: false,
    });
    expect(card.latestReviews[0].reply?.body).toBe('谢谢你');
    expect(toProfileCard({ ...PROFILE, completionRate: null }).completionRate).toBeNull();
    expect(toProfileCard({ ...PROFILE, completionRate: '0.9600' }).completionRate).toBe(0.96);
    expect(() => toProfileCard({ ...PROFILE, completionRate: 96 })).toThrow();
    expect(() => toProfileCard({ ...PROFILE, helped: -1 })).toThrow();
  });

  test('a review page carries its cursor only when there is more', () => {
    const items = PROFILE.latestReviews;
    expect(toReviewPage({ items, hasMore: false, nextCursor: null }).nextCursor).toBeNull();
    const cursor = '2026-11-05 02:00:00+00|r2';
    expect(toReviewPage({ items, hasMore: true, nextCursor: cursor }).nextCursor).toBe(cursor);
    expect(() => toReviewPage({ items, hasMore: true, nextCursor: null })).toThrow();
  });

  test('my mascot parses the private fields', () => {
    const mascot = toMyMascot({
      level: 5,
      stickers: 25,
      accessory: 'scarf',
      seenLevel: 4,
      levelUp: true,
      nextLevelAt: 40,
      chosenAccessory: null,
      unlocked: ['red_hat', 'backpack', 'umbrella', 'scarf'],
    });
    expect(mascot).toMatchObject({ level: 5, levelUp: true, nextLevelAt: 40, accessory: 'scarf' });
    expect(() => toMyMascot({ level: 1, stickers: 0, accessory: 'cape' })).toThrow();
  });

  test('no pending tier drop is null; a drop carries its reason and way back', () => {
    expect(toTierDrop(null)).toBeNull();
    const drop = toTierDrop({
      id: 7,
      from: 'very_reliable',
      to: 'reliable',
      droppedAt: '2026-11-06T19:30:00+00:00',
      detail: {
        noShows: [{ at: '2026-06-02T01:00:00+00:00', kind: 'bounty', title: '帮取快递' }],
        noShowCount: 1,
        negativeReviews: 0,
        settled: 8,
        people: 4,
        toRegain: { tier: 'very_reliable', settled: 2, newPeople: 1, goodReviews: 0 },
      },
    });
    expect(drop).toMatchObject({ id: 7, to: 'reliable', noShowCount: 1, people: 4 });
    expect(drop?.toRegain).toEqual({
      tier: 'very_reliable',
      settled: 2,
      newPeople: 1,
      goodReviews: 0,
    });
  });
});

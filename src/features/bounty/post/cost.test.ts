import { describe, expect, test } from 'bun:test';

import { costLine, payTarget, malaysiaDay } from './cost';
import type { PostStatus, UnpaidSummary } from './types';

const NEXT = '2026-10-31T16:00:00Z';

const status = (patch: Partial<PostStatus>): PostStatus => ({
  blocked: false,
  unpaid: [],
  coins: 0,
  freePostsLeft: 3,
  freePostsPerMonth: 3,
  nextFreeAt: NEXT,
  ...patch,
});

const lily: UnpaidSummary = {
  paymentId: 'payment-lily',
  payeeName: 'Lily',
  amount: { minor: 600, currency: 'MYR' },
  createdAt: '2026-10-25T00:00:00Z',
};
const jie: UnpaidSummary = {
  paymentId: 'payment-jie',
  payeeName: '阿杰',
  amount: { minor: 1500, currency: 'MYR' },
  createdAt: '2026-10-20T00:00:00Z',
};

describe('costLine', () => {
  test('free slots left', () => {
    expect(costLine(status({ freePostsLeft: 2 }))).toEqual({ kind: 'free', left: 2, of: 3 });
    expect(costLine(status({ freePostsLeft: 1, coins: 9 }))).toEqual({
      kind: 'free',
      left: 1,
      of: 3,
    });
  });

  test('a coin when no free slot is left', () => {
    expect(costLine(status({ freePostsLeft: 0, coins: 4 }))).toEqual({ kind: 'coin', balance: 4 });
    expect(costLine(status({ freePostsLeft: 0, coins: 1 }))).toEqual({ kind: 'coin', balance: 1 });
  });

  test('no slot and no coin names the next free slot', () => {
    expect(costLine(status({ freePostsLeft: 0, coins: 0 }))).toEqual({
      kind: 'none',
      nextFreeAt: NEXT,
    });
  });

  test.each([
    [{ freePostsLeft: 2 }, 'free'],
    [{ freePostsLeft: 0, coins: 4 }, 'coin'],
    [{ freePostsLeft: 0, coins: 0 }, 'none'],
  ] as const)('blocked wins over %p', (patch, under) => {
    expect(costLine(status({ ...patch, blocked: true, unpaid: [lily, jie] }))).toEqual({
      kind: 'blocked',
      unpaid: [jie, lily],
      under,
    });
  });

  test('unpaid items without the blocked flag do not block', () => {
    expect(costLine(status({ freePostsLeft: 2, unpaid: [jie] })).kind).toBe('free');
  });
});

describe('malaysiaDay', () => {
  test('reads the calendar day in Malaysia time', () => {
    expect(malaysiaDay(NEXT)).toEqual({ year: 2026, month: 11, day: 1 });
    expect(malaysiaDay('2026-11-30T15:59:59Z')).toEqual({ year: 2026, month: 11, day: 30 });
    expect(malaysiaDay('2026-12-31T16:00:00Z')).toEqual({ year: 2027, month: 1, day: 1 });
  });
});

describe('payTarget', () => {
  test('blocked pays the oldest unpaid payment', () => {
    expect(payTarget(costLine(status({ blocked: true, unpaid: [lily, jie] })))).toBe(jie.paymentId);
  });

  test('blocked with no unpaid payment read yet has nothing to pay', () => {
    expect(payTarget(costLine(status({ blocked: true, unpaid: [] })))).toBeNull();
  });

  test('an unblocked line has nothing to pay', () => {
    expect(payTarget(costLine(status({ blocked: false, unpaid: [jie] })))).toBeNull();
  });
});

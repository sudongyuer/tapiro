import { describe, expect, test } from 'bun:test';

import { toPostStatus } from './rideService';

describe('toPostStatus', () => {
  test('a balance below 0 after a refund (268 A) still reads, so free posts stay usable', () => {
    const balance = {
      freePostsLeft: 1,
      freePostsPerMonth: 3,
      nextFreeAt: '2026-12-01T00:00:00+08:00',
    };
    expect(toPostStatus(false, { ...balance, coins: -6 }, 1).coins).toBe(-6);
    expect(() => toPostStatus(false, { ...balance, coins: 0.5 }, 1)).toThrow();
  });
});

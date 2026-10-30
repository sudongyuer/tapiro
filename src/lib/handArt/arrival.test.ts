import { expect, test } from 'bun:test';

import { markArrival, takeArrival } from './arrival';

test('a published bounty lands once, only on its own card, and not after a minute', () => {
  markArrival('b1', 0);
  expect(takeArrival('b2', 10)).toBe(false);
  expect(takeArrival('b1', 10)).toBe(true);
  expect(takeArrival('b1', 20)).toBe(false);
  markArrival('b1', 0);
  expect(takeArrival('b1', 60_000)).toBe(false);
});

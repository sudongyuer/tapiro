import { expect, test } from 'bun:test';

import { coinCount } from './coinCount';

test('a negative balance uses the minus sign the history rows use', () => {
  expect(coinCount(-6, 'en')).toBe('−6');
  expect(coinCount(-1234, 'zh-Hans')).toBe('−1,234');
});

test('balances group thousands in the reading language', () => {
  expect(coinCount(1234, 'en')).toBe('1,234');
  expect(coinCount(12, 'ms')).toBe('12');
  expect(coinCount(0, 'zh-Hans')).toBe('0');
});

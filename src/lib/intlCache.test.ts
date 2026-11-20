import { expect, test } from 'bun:test';

import { inTimeZone } from './inTimeZone';
import { dateFormat, numberFormat } from './intlCache';

test('the same locale and options reuse one formatter', () => {
  expect(numberFormat('en', { maximumFractionDigits: 1 })).toBe(
    numberFormat('en', { maximumFractionDigits: 1 }),
  );
  expect(dateFormat('en', { month: 'short' })).toBe(dateFormat('en', { month: 'short' }));
});

test('a different locale or option builds its own formatter', () => {
  expect(numberFormat('en', { maximumFractionDigits: 1 }).format(1.25)).toBe('1.3');
  expect(numberFormat('en', { maximumFractionDigits: 0 }).format(1.25)).toBe('1');
  expect(numberFormat('ms').format(1234.5)).toBe('1,234.5');
  expect(numberFormat('de').format(1234.5)).toBe('1.234,5');
});

test('an explicit time zone is part of the key', () => {
  const at = new Date('2026-01-01T20:00:00Z');
  expect(dateFormat('en', { day: 'numeric', timeZone: 'UTC' }).format(at)).toBe('1');
  expect(dateFormat('en', { day: 'numeric', timeZone: 'Asia/Kuala_Lumpur' }).format(at)).toBe('2');
});

test('a formatter built in one default zone is not reused in another', () => {
  const at = new Date('2026-01-01T20:00:00Z');
  const day = () => dateFormat('en', { day: 'numeric' }).format(at);
  expect(inTimeZone('UTC', day)).toBe('1');
  expect(inTimeZone('Asia/Kuala_Lumpur', day)).toBe('2');
});

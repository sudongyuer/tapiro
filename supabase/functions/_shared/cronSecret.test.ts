import { describe, expect, test } from 'bun:test';

import { cronSecretCheck } from './cronSecret.ts';

describe('cronSecretCheck', () => {
  const matches = cronSecretCheck('a'.repeat(64));

  test('accepts only the exact secret', () => {
    expect(matches('a'.repeat(64))).toBe(true);
    expect(matches('a'.repeat(63) + 'b')).toBe(false);
    expect(matches('a'.repeat(63))).toBe(false);
    expect(matches('a'.repeat(65))).toBe(false);
    expect(matches('')).toBe(false);
  });

  test('rejects everything when the secret is not configured', () => {
    expect(cronSecretCheck(undefined)('')).toBe(false);
    expect(cronSecretCheck('')('')).toBe(false);
    expect(cronSecretCheck(undefined)('anything')).toBe(false);
  });
});

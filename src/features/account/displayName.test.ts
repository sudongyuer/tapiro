import { describe, expect, test } from 'bun:test';

import { checkDisplayName, initialDisplayName } from './displayName';

describe('checkDisplayName', () => {
  test('trims and accepts 1 to 40 characters', () => {
    expect(checkDisplayName('  林小貘 ')).toEqual({ ok: true, value: '林小貘' });
    expect(checkDisplayName('a'.repeat(40))).toEqual({ ok: true, value: 'a'.repeat(40) });
  });

  test('rejects empty and whitespace-only names', () => {
    expect(checkDisplayName('')).toEqual({ ok: false, reason: 'empty' });
    expect(checkDisplayName(' \n\t ')).toEqual({ ok: false, reason: 'empty' });
  });

  test('counts code points like Postgres char_length, not UTF-16 units', () => {
    expect(checkDisplayName('😀'.repeat(40))).toEqual({ ok: true, value: '😀'.repeat(40) });
    expect(checkDisplayName('😀'.repeat(41))).toEqual({ ok: false, reason: 'tooLong' });
    expect(checkDisplayName('貘'.repeat(41))).toEqual({ ok: false, reason: 'tooLong' });
  });
});

describe('initialDisplayName', () => {
  test('prefers a real profile name', () => {
    expect(initialDisplayName('Aisyah', 'Token Name')).toBe('Aisyah');
  });

  test('ignores the server placeholder and falls back to the token name', () => {
    expect(initialDisplayName('Tapiro', ' Lim ')).toBe('Lim');
    expect(initialDisplayName('Tapiro', null)).toBe('');
    expect(initialDisplayName(null, null)).toBe('');
  });
});

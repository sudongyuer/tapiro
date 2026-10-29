import { describe, expect, test } from 'bun:test';

import { sentence } from './sentence';

describe('sentence', () => {
  test('a line that opens with a lower-case fallback name starts upper-case', () => {
    expect(sentence('pihak lain dalam perjalanan')).toBe('Pihak lain dalam perjalanan');
    expect(sentence('the other person headed out')).toBe('The other person headed out');
  });

  test('Chinese, names and empty text are unchanged', () => {
    expect(sentence('对方在路上')).toBe('对方在路上');
    expect(sentence('Aiman dalam perjalanan')).toBe('Aiman dalam perjalanan');
    expect(sentence('')).toBe('');
  });
});

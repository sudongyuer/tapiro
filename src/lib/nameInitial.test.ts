import { describe, expect, test } from 'bun:test';

import { nameInitial } from './nameInitial';

describe('nameInitial', () => {
  test('takes the given name of a Chinese name', () => {
    expect(nameInitial('小林')).toBe('林');
    expect(nameInitial('阿杰')).toBe('杰');
  });

  test('takes the first letter of a Latin name, upper-cased', () => {
    expect(nameInitial('mei Ling')).toBe('M');
    expect(nameInitial('  Nur Aisyah')).toBe('N');
  });

  test('keeps a whole emoji and returns nothing for a blank name', () => {
    expect(nameInitial('🐼 Panda')).toBe('🐼');
    expect(nameInitial('   ')).toBe('');
  });
});

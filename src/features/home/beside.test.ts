import { describe, expect, test } from 'bun:test';

import { exceedsBeside } from './beside';

describe('exceedsBeside', () => {
  test('two lines still fit beside the number', () => {
    expect(exceedsBeside(1)).toBe(false);
    expect(exceedsBeside(2)).toBe(false);
  });

  test('a third line moves the number below', () => {
    expect(exceedsBeside(3)).toBe(true);
    expect(exceedsBeside(6)).toBe(true);
  });
});

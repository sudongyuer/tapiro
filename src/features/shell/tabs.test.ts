import { describe, expect, test } from 'bun:test';

import { isShellTab, tabLocation } from './tabs';

describe('tabLocation', () => {
  test('the bounty root', () => {
    expect(tabLocation(['(tabs)', 'bounty'])).toEqual({ tab: 'bounty', onRoot: true });
    expect(tabLocation(['(tabs)', 'bounty', 'index'])).toEqual({ tab: 'bounty', onRoot: true });
  });

  test('a screen pushed inside a tab', () => {
    expect(tabLocation(['(tabs)', 'me', 'settings'])).toEqual({ tab: 'me', onRoot: false });
  });

  test('root routes outside the tabs', () => {
    expect(tabLocation(['ask'])).toBeNull();
    expect(tabLocation(['(tabs)', 'tapir'])).toBeNull();
  });
});

describe('isShellTab', () => {
  test('accepts only the four tabs', () => {
    expect(isShellTab('ride')).toBe(true);
    expect(isShellTab('tapir')).toBe(false);
    expect(isShellTab(undefined)).toBe(false);
  });
});

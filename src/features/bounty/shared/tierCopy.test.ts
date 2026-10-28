import { describe, expect, test } from 'bun:test';
import { createInstance } from 'i18next';

import { LANGUAGES } from '@/lib/i18n/languages';
import { resources } from '@/lib/i18n/resources';

import { TIERS } from '../board/types';
import { tierName, tierRank } from './tierCopy';

describe('tierRank', () => {
  test('counts one head for a new friend up to four for a tapir friend', () => {
    expect(TIERS.map(tierRank)).toEqual([1, 2, 3, 4]);
  });
});

describe.each(LANGUAGES.map((language) => language.code))('%s tier names', (code) => {
  const i18n = createInstance();
  i18n.init({ resources, lng: code, initAsync: false, interpolation: { escapeValue: false } });

  test('name every tier with its own copy', () => {
    const names = TIERS.map((tier) => tierName(tier, i18n.t));
    for (const name of names) expect(name).not.toStartWith('bounty.');
    expect(new Set(names).size).toBe(TIERS.length);
  });
});

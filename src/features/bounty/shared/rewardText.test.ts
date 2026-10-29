import { describe, expect, test } from 'bun:test';
import { createInstance } from 'i18next';

import { resources } from '@/lib/i18n/resources';
import type { Money, MoneyReference } from '@/lib/money';

import { rewardText } from './rewardText';

function translator(lng: string) {
  const i18n = createInstance();
  i18n.init({ resources, lng, initAsync: false, interpolation: { escapeValue: false } });
  return i18n.t;
}

const CNY: Money = { minor: 5000, currency: 'CNY' };
const RM: MoneyReference = { minor: 3247, currency: 'MYR', rateDate: '2026-10-28' };

describe('rewardText', () => {
  test('a ¥ reward reads in yuan, with the RM reference on its own line', () => {
    const copy = rewardText(CNY, RM, translator('zh-Hans'), 'zh-Hans');
    expect(copy.reward).toBe('¥50');
    expect(copy.rewardLabel).toBe('赏金 ¥50');
    expect(copy.reference).toBe('约 RM 32.47');
  });

  test('every locale wraps the reference in its own words', () => {
    expect(rewardText(CNY, RM, translator('en'), 'en').reference).toBe('About RM 32.47');
    expect(rewardText(CNY, RM, translator('ms'), 'ms').reference).toBe('Kira-kira RM 32.47');
  });

  test('no reference without a rate, or when it is in the reward currency', () => {
    const t = translator('zh-Hans');
    expect(rewardText(CNY, null, t, 'zh-Hans')).toEqual({
      reward: '¥50',
      rewardLabel: '赏金 ¥50',
      reference: null,
    });
    const rm: Money = { minor: 800, currency: 'MYR' };
    expect(rewardText(rm, { ...RM, minor: 800 }, t, 'zh-Hans').reference).toBeNull();
    expect(rewardText(rm, null, t, 'zh-Hans').reward).toBe('RM 8');
  });

  test('a whole reference drops the fraction', () => {
    const copy = rewardText(CNY, { ...RM, minor: 3200 }, translator('zh-Hans'), 'zh-Hans');
    expect(copy.reference).toBe('约 RM 32');
  });
});

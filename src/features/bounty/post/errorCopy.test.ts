import { describe, expect, test } from 'bun:test';

import { resources } from '@/lib/i18n/resources';
import type { CurrencyCode } from '@/lib/money';

import { errorKey } from './errorCopy';
import { DRAFT_ERRORS } from './types';

const zh: Record<string, string> = resources['zh-Hans'].translation.bounty.post.error;

function render(error: (typeof DRAFT_ERRORS)[number], currency: CurrencyCode = 'MYR') {
  const { values } = errorKey(error, 'zh-Hans', currency);
  return zh[error].replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
    String((values as Record<string, unknown>)[name]),
  );
}

describe('draft error copy', () => {
  test('fills the limits the validator enforces', () => {
    expect(render('titleTooLong')).toContain('60');
    expect(render('descriptionTooLong')).toContain('500');
    expect(render('placeTooLong')).toContain('80');
    expect(render('addressTooLong')).toContain('120');
    expect(render('rewardRange')).toBe('赏金是 RM\u00a01–500 的整数');
    expect(render('rewardRange', 'CNY')).toBe('赏金是 ¥1–800 的整数');
    expect(render('timeTooFar')).toContain('30');
  });

  test('every error renders without a missing value', () => {
    for (const error of DRAFT_ERRORS) {
      expect(render(error)).not.toContain('undefined');
      expect(errorKey(error, 'zh-Hans', 'MYR').key).toBe(`bounty.post.error.${error}`);
    }
  });
});

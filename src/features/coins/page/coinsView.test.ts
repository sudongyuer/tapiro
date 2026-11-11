import { describe, expect, test } from 'bun:test';
import { createInstance } from 'i18next';

import { resources } from '@/lib/i18n/resources';

import type { CoinRow } from '../types';
import { coinCount, monthLabel, rowA11y, rowTitle } from './coinsView';

function translator(lng: string) {
  const i18n = createInstance();
  i18n.init({ resources, lng, initAsync: false, interpolation: { escapeValue: false } });
  return i18n.t.bind(i18n);
}

const NOW = new Date('2026-11-06T04:00:00Z');

const row = (overrides: Partial<CoinRow> = {}): CoinRow => ({
  id: 1,
  reason: 'post_spend',
  delta: -1,
  at: '2026-11-02T12:00:00Z',
  month: '2026-11',
  item: { kind: 'bounty', id: 'b1', title: '帮取快递' },
  sandbox: false,
  ...overrides,
});

describe('coins page view', () => {
  test('a month header names the year only outside the current year', () => {
    const en = translator('en');
    const zh = translator('zh-Hans');
    expect(monthLabel('2026-11', en, NOW)).toBe('November');
    expect(monthLabel('2025-12', en, NOW)).toBe('December 2025');
    expect(monthLabel('2026-01', zh, NOW)).toBe('1 月');
    expect(monthLabel('2025-12', zh, NOW)).toBe('2025 年 12 月');
    expect(monthLabel('2026-03', translator('ms'), NOW)).toBe('Mac');
    const newYear = new Date('2026-12-31T17:00:00Z');
    expect(monthLabel('2027-01', zh, newYear)).toBe('1 月');
    expect(monthLabel('2026-12', zh, newYear)).toBe('2026 年 12 月');
  });

  test('a row reads its reason and the item title when there is one; unknown reasons read 其他', () => {
    const t = translator('zh-Hans');
    expect(rowTitle(row(), t)).toBe('发布 · 帮取快递');
    expect(rowTitle(row({ reason: 'weekly_feed', delta: 1, item: null }), t)).toBe('每周投喂');
    expect(rowTitle(row({ reason: 'other', item: null }), t)).toBe('其他');
    expect(rowTitle(row({ item: { kind: 'ride', id: 'r1', title: '  ' } }), t)).toBe('发布');
  });

  test('purchase rows read their own reason in every language, and a test purchase says so', () => {
    const zh = translator('zh-Hans');
    const purchase = row({ reason: 'purchase', delta: 11, item: null });
    expect(rowTitle(purchase, zh)).toBe('买貘币');
    expect(rowTitle({ ...purchase, sandbox: true }, zh)).toBe('买貘币 · 测试购买');
    expect(rowTitle(row({ reason: 'purchase_refund', delta: -11, item: null }), zh)).toBe(
      '退款收回',
    );
    for (const lng of ['en', 'ms']) {
      const t = translator(lng);
      for (const reason of ['purchase', 'purchase_refund', 'purchase_refund_reversed'] as const) {
        const title = rowTitle(row({ reason, item: null }), t);
        expect(title).not.toBe(t('coins.reason.other'));
        expect(title).not.toContain('coins.');
      }
    }
  });

  test('a negative balance after a refund reads with its sign', () => {
    expect(coinCount(-6, 'en')).toBe('-6');
  });

  test('VoiceOver reads the whole title, the signed delta and the date', () => {
    const label = rowA11y(row(), translator('en'), 'en');
    expect(label).toBe('Post · 帮取快递, −1, 2 Nov');
  });

  test('balances group thousands in the reading language', () => {
    expect(coinCount(1234, 'en')).toBe('1,234');
    expect(coinCount(12, 'ms')).toBe('12');
  });
});

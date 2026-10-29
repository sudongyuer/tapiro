import { describe, expect, test } from 'bun:test';

import type { Money } from '@/lib/money';
import type { PayeeMethod } from '@/lib/payeeMethods';

import {
  blockedCurrency,
  celebrationNote,
  methodRows,
  originalIfConverted,
  payerChoice,
} from './amounts';
import { lockedConversion, rateText } from './fx';
import { payOptions } from './payOptions';
import type { FxRate, MethodAmount } from './types';

const base = {
  isDefault: false,
  createdAt: '2026-10-01T00:00:00Z',
  checkedAt: '2026-10-01T00:00:00Z',
};
const METHODS: PayeeMethod[] = [
  { ...base, id: 'phone', type: 'duitnow_id', phone: '+60123456789', displayName: 'LIM' },
  { ...base, id: 'alipay', type: 'alipay', payload: 'https://qr.alipay.com/x', displayName: 'LIM' },
  { ...base, id: 'wechat', type: 'wechat', payload: 'wxp://x', displayName: 'LIM' },
  { ...base, id: 'cash', type: 'cash' },
];
const yuan = (minor: number): Money => ({ minor, currency: 'CNY' });
const ringgit = (minor: number): Money => ({ minor, currency: 'MYR' });
const RATE: FxRate = {
  base: 'CNY',
  quote: 'MYR',
  quotePerBase: 0.6494,
  rateDate: '2026-10-28',
  source: 'bnm',
};

function amounts(entries: Record<string, Money | null>): MethodAmount[] {
  return METHODS.map((method) => ({
    methodId: method.id,
    type: method.type,
    currency: method.type === 'duitnow_id' ? 'MYR' : 'CNY',
    amount: entries[method.id] ?? null,
  }));
}

describe('pay sheet method amounts (66A)', () => {
  const locked = amounts({
    phone: ringgit(3247),
    alipay: yuan(5000),
    wechat: yuan(5000),
    cash: yuan(5000),
  });

  test('each method row carries its own amount from the payment detail, in the sheet order', () => {
    const rows = methodRows(payOptions(METHODS), locked);
    expect(rows.map((row) => [row.option.id, row.amount])).toEqual([
      ['alipay', yuan(5000)],
      ['wechat', yuan(5000)],
      ['phone', ringgit(3247)],
      ['cash', yuan(5000)],
    ]);
    expect(rows.map(blockedCurrency)).toEqual([null, null, null, null]);
  });

  test('a converted method shows the locked rate footer; same-currency methods do not', () => {
    const converted = payerChoice(methodRows(payOptions(METHODS), locked), yuan(5000));
    expect(converted).toMatchObject({ kind: 'methods', converted: true, initial: null });
    const same = payerChoice(methodRows(payOptions([METHODS[1]]), locked), yuan(5000));
    expect(same).toMatchObject({ kind: 'methods', converted: false, initial: 'alipay' });
  });

  test('a method the detail does not list is not offered', () => {
    expect(methodRows(payOptions(METHODS), locked.slice(1)).map((row) => row.option.id)).toEqual([
      'alipay',
      'wechat',
      'cash',
    ]);
  });

  test('without a locked rate a method in the other currency is disabled with its currency', () => {
    const rows = methodRows(
      payOptions(METHODS),
      amounts({ alipay: yuan(5000), wechat: yuan(5000), cash: yuan(5000) }),
    );
    expect(rows.map(blockedCurrency)).toEqual([null, null, 'MYR', null]);
    expect(payerChoice(rows, yuan(5000))).toMatchObject({ kind: 'methods', converted: false });
  });

  test('a lone method that cannot be converted is never preselected', () => {
    const rows = methodRows(payOptions([METHODS[0]]), amounts({}));
    expect(payerChoice(rows, yuan(5000))).toEqual({ kind: 'noCurrency', currency: 'CNY' });
  });

  test('no method at all is the existing no-payee case', () => {
    expect(payerChoice([], yuan(5000))).toEqual({ kind: 'none' });
  });
});

describe('locked rate', () => {
  test('converts at the locked rate and rounds up to the sen; no rate means no conversion', () => {
    expect(lockedConversion(yuan(5000), RATE)).toEqual(ringgit(3247));
    expect(lockedConversion(ringgit(800), { ...RATE, quotePerBase: 0.6122 })).toEqual(yuan(1307));
    expect(lockedConversion(yuan(5000), null)).toBeNull();
  });

  test('names the rate from the original currency with its date, per locale', () => {
    expect(rateText(RATE, 'CNY', 'zh-Hans')).toEqual({
      date: '2026年10月28日',
      rate: '¥1 = RM 0.6494',
    });
    expect(rateText(RATE, 'MYR', 'en')?.rate).toBe('RM 1 = ¥1.5399');
    expect(rateText(RATE, 'CNY', 'ms')?.date).toBe('28 Oktober 2026');
  });
});

describe('what the payee and the celebration show', () => {
  test('a converted payment shows what was paid, with the original', () => {
    const payment = { amount: yuan(5000), paid: ringgit(3247) };
    expect(originalIfConverted(payment)).toEqual(yuan(5000));
    expect(celebrationNote(payment, RATE)).toEqual({
      key: 'pay.sheet.original',
      amount: yuan(5000),
    });
  });

  test('a payment in its own currency shows only the amount, with a reference only at a locked rate', () => {
    const payment = { amount: ringgit(800), paid: ringgit(800) };
    expect(originalIfConverted(payment)).toBeNull();
    expect(celebrationNote(payment, { ...RATE, quotePerBase: 0.6122 })).toEqual({
      key: 'pay.celebrate.cny',
      amount: yuan(1307),
    });
    expect(celebrationNote(payment, null)).toBeNull();
  });

  test('a cash settle without a paid amount celebrates the original amount', () => {
    const payment = { amount: yuan(800), paid: null };
    expect(originalIfConverted(payment)).toBeNull();
    expect(celebrationNote(payment, null)).toBeNull();
  });
});

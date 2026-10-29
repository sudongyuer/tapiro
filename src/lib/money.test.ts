import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  CURRENCIES,
  convertUp,
  formatMoney,
  methodCurrency,
  moneyParts,
  POST_LIMITS,
  toMoney,
  totalsByCurrency,
  type Money,
} from './money';
import { PAYEE_TYPES } from './payeeMethods';

const LOCALES = ['zh-Hans', 'en', 'ms'];
const schema = readFileSync(
  join(import.meta.dir, '../../supabase/migrations/20261029000200_money_schema.sql'),
  'utf8',
);

function insertedRows(table: string) {
  const match = new RegExp(`insert into public\\.${table} \\([^)]*\\)\\s*values\\s*([^;]+);`).exec(
    schema,
  );
  if (!match) throw new Error(`no insert into ${table}`);
  return [...match[1].matchAll(/\(([^)]*)\)/g)].map((row) =>
    row[1].split(',').map((cell) => cell.trim().replace(/^'(.*)'$/, '$1')),
  );
}

const normalized = (text: string) => text.replace(/\u00a0/g, ' ');
const myr = (minor: number): Money => ({ minor, currency: 'MYR' });
const cny = (minor: number): Money => ({ minor, currency: 'CNY' });

describe('mirrors of the money schema', () => {
  test('CURRENCIES matches every enabled currencies row', () => {
    const rows = insertedRows('currencies').filter(([, , , enabled]) => enabled === 'true');
    expect(
      Object.fromEntries(
        rows.map(([code, digits, symbol]) => [code, { minorDigits: Number(digits), symbol }]),
      ),
    ).toEqual(CURRENCIES);
  });

  test('POST_LIMITS matches the post_limits rows', () => {
    const limits: Record<string, Record<string, unknown>> = {};
    for (const [kind, currency, min, max, step] of insertedRows('post_limits')) {
      limits[kind] = {
        ...limits[kind],
        [currency]: { minMinor: Number(min), maxMinor: Number(max), stepMinor: Number(step) },
      };
    }
    expect(limits).toEqual(POST_LIMITS);
  });

  test('methodCurrency matches public.method_currency', () => {
    const body = /create function public\.method_currency[\s\S]+?\$\$([\s\S]+?)\$\$/.exec(
      schema,
    )?.[1];
    const mapped = Object.fromEntries(
      [...(body ?? '').matchAll(/when '(\w+)' then (\w+|'\w+')/g)].map(([, type, to]) => [
        type,
        to,
      ]),
    );
    for (const type of PAYEE_TYPES) {
      const expected = mapped[type] === 'item_currency' ? 'CNY' : mapped[type]?.replace(/'/g, '');
      expect(methodCurrency(type, 'CNY')).toBe(expected as never);
    }
    expect(methodCurrency('cash', 'MYR')).toBe('MYR');
  });
});

describe.each(LOCALES)('formatMoney in %s', (locale) => {
  test('MYR shows RM, a non-breaking space and two decimals', () => {
    const format = (minor: number) => formatMoney(myr(minor), locale);
    expect(format(1250)).toBe('RM\u00a012.50');
    expect(format(5)).toBe('RM\u00a00.05');
    expect(format(0)).toBe('RM\u00a00.00');
    expect(normalized(format(1234560))).toBe('RM 12,345.60');
    expect(normalized(format(-1250))).toBe('-RM 12.50');
  });

  test('CNY shows ¥, a non-breaking space and two decimals', () => {
    const format = (minor: number) => formatMoney(cny(minor), locale);
    expect(format(2450)).toBe('¥\u00a024.50');
    expect(format(80000)).toBe('¥\u00a0800.00');
    expect(normalized(format(100000))).toBe('¥ 1,000.00');
  });

  test('whole drops a zero fraction and never rounds a real one', () => {
    expect(formatMoney(myr(800), locale, { whole: true })).toBe('RM\u00a08');
    expect(formatMoney(myr(850), locale, { whole: true })).toBe('RM\u00a08.50');
    expect(normalized(formatMoney(cny(100000), locale, { whole: true }))).toBe('¥ 1,000');
    expect(formatMoney(cny(1), locale, { whole: true })).toBe('¥\u00a00.01');
  });

  test('moneyParts splits the symbol, the whole part and the fraction', () => {
    expect(moneyParts(myr(1234560), locale)).toEqual({
      symbol: 'RM',
      whole: '12,345',
      fraction: '.60',
    });
    expect(moneyParts(cny(50), locale)).toEqual({ symbol: '¥', whole: '0', fraction: '.50' });
    expect(moneyParts(myr(-1250), locale)).toEqual({ symbol: 'RM', whole: '-12', fraction: '.50' });
    expect(moneyParts(myr(1500), locale, { whole: true })).toEqual({
      symbol: 'RM',
      whole: '15',
      fraction: '',
    });
  });
});

describe('convertUp', () => {
  test('rounds up to the minor unit at the pgTAP half-sen boundaries', () => {
    expect(convertUp(cny(1000), 0.61225, 'CNY', 'MYR')).toEqual(myr(613));
    expect(convertUp(cny(10000), 0.61225, 'CNY', 'MYR')).toEqual(myr(6123));
  });

  test('leaves an exact conversion as it is', () => {
    expect(convertUp(cny(20000), 0.61225, 'CNY', 'MYR')).toEqual(myr(12245));
  });

  test('divides from the quote currency and rounds up', () => {
    expect(convertUp(myr(1000), 0.61225, 'CNY', 'MYR')).toEqual(cny(1634));
    expect(convertUp(myr(50000), 0.61225, 'CNY', 'MYR')).toEqual(cny(81666));
    expect(convertUp(cny(80000), 0.61225, 'CNY', 'MYR')).toEqual(myr(48980));
  });

  test('returns null for a currency outside the pair or a bad rate', () => {
    expect(convertUp(myr(1000), 0, 'CNY', 'MYR')).toBeNull();
    expect(convertUp(myr(1000), Number.NaN, 'CNY', 'MYR')).toBeNull();
    expect(convertUp(myr(1000), 0.6, 'CNY', 'CNY')).toBeNull();
  });
});

test('toMoney rejects unknown currencies and non-integer amounts', () => {
  expect(toMoney(800, 'MYR')).toEqual(myr(800));
  expect(toMoney(800, 'USD')).toBeNull();
  expect(toMoney(8.5, 'MYR')).toBeNull();
  expect(toMoney('800', 'MYR')).toBeNull();
});

test('totalsByCurrency sums each currency on its own', () => {
  expect(totalsByCurrency([myr(1500), cny(1000), myr(600)])).toEqual([myr(2100), cny(1000)]);
});

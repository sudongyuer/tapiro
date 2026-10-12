import { describe, expect, test } from 'bun:test';

import { formatRinggit, parseUnsettledPayments } from './unsettledPayments';

describe('parseUnsettledPayments', () => {
  const valid = {
    id: 'p',
    title: 't',
    counterpartName: 'n',
    amountSen: 0,
    direction: 'owe' as const,
  };

  test('keeps only items with the documented shape', () => {
    expect(
      parseUnsettledPayments({
        payments: [
          valid,
          { ...valid, amountSen: 1.5 },
          { ...valid, amountSen: -1 },
          { ...valid, direction: 'sideways' },
          { ...valid, title: undefined },
          null,
        ],
      }),
    ).toEqual([valid]);
  });

  test('anything else yields no items', () => {
    expect(parseUnsettledPayments(null)).toEqual([]);
    expect(parseUnsettledPayments({ payments: {} })).toEqual([]);
    expect(parseUnsettledPayments('payments')).toEqual([]);
  });
});

test.each(['zh-Hans', 'en', 'ms'])(
  'formatRinggit shows sen as RM with two decimals in %s',
  (locale) => {
    const normalized = (sen: number) => formatRinggit(sen, locale).replace(/\s/g, ' ');
    expect(normalized(1250)).toMatch(/^RM ?12\.50$/);
    expect(normalized(5)).toMatch(/^RM ?0\.05$/);
    expect(normalized(123456)).toMatch(/^RM ?1,234\.56$/);
  },
);

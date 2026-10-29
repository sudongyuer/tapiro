import { describe, expect, test } from 'bun:test';

import { parseUnsettledPayments } from './unsettledPayments';

describe('parseUnsettledPayments', () => {
  const valid = {
    id: 'p',
    title: 't',
    counterpartName: 'n',
    amountMinor: 0,
    currency: 'MYR',
    direction: 'owe' as const,
  };

  test('keeps only items with the documented shape', () => {
    expect(
      parseUnsettledPayments({
        payments: [
          valid,
          { ...valid, amountMinor: 1.5 },
          { ...valid, amountMinor: -1 },
          { ...valid, currency: 'USD' },
          { ...valid, currency: undefined },
          { ...valid, direction: 'sideways' },
          { ...valid, title: undefined },
          null,
        ],
      }),
    ).toEqual([
      {
        id: 'p',
        title: 't',
        counterpartName: 'n',
        amount: { minor: 0, currency: 'MYR' },
        direction: 'owe',
      },
    ]);
  });

  test('anything else yields no items', () => {
    expect(parseUnsettledPayments(null)).toEqual([]);
    expect(parseUnsettledPayments({ payments: {} })).toEqual([]);
    expect(parseUnsettledPayments('payments')).toEqual([]);
  });
});

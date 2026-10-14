import { describe, expect, test } from 'bun:test';

import { parseUnsettledPayments } from './unsettledPayments';

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

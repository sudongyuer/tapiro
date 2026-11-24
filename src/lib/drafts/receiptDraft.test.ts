import { describe, expect, test } from 'bun:test';

import { parseReceiptReply } from './receiptDraft';

const reply = (result: unknown, tool = 'draft_split') => ({ tool, result });

describe('a receipt reply', () => {
  test('a total with no currency is read in the ride currency', () => {
    expect(parseReceiptReply(reply({ total: '18.4', currency: null }), 'CNY')).toEqual({
      kind: 'read',
      total: { minor: 1840, currency: 'CNY' },
    });
  });

  test('a total in another currency is named, not filled', () => {
    expect(parseReceiptReply(reply({ total: '120', currency: 'CNY' }), 'MYR')).toEqual({
      kind: 'otherCurrency',
      total: { minor: 12000, currency: 'CNY' },
    });
  });

  test('nothing read is its own answer; another tool is not a reading', () => {
    expect(parseReceiptReply(reply({ total: null, currency: null }), 'MYR')).toEqual({
      kind: 'unreadable',
    });
    expect(parseReceiptReply(reply({ text: '18.40' }, 'answer'), 'MYR')).toBeNull();
    expect(parseReceiptReply(null, 'MYR')).toBeNull();
  });
});

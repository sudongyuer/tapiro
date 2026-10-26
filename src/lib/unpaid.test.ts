import { describe, expect, test } from 'bun:test';

import { isUnpaid, publishBlocked, reminderDue, type UnpaidInput } from './unpaid';

const NOW = new Date('2026-10-25T12:00:00Z');
const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000).toISOString();
const due = (hours: number): UnpaidInput => ({
  state: 'due',
  nudgedAt: null,
  createdAt: hoursAgo(hours),
});

describe('isUnpaid', () => {
  test('due and 还没收到 count; waiting for confirmation and settled do not', () => {
    expect(isUnpaid(due(1))).toBe(true);
    expect(isUnpaid({ state: 'marked_paid', nudgedAt: hoursAgo(1), createdAt: hoursAgo(2) })).toBe(
      true,
    );
    expect(isUnpaid({ state: 'marked_paid', nudgedAt: null, createdAt: hoursAgo(2) })).toBe(false);
    expect(isUnpaid({ state: 'settled', nudgedAt: null, createdAt: hoursAgo(2) })).toBe(false);
  });
});

describe('publishBlocked', () => {
  test('one fresh unpaid payment does not block', () => {
    expect(publishBlocked([due(1)], NOW)).toBe(false);
  });
  test('two open unpaid payments block', () => {
    expect(publishBlocked([due(1), due(2)], NOW)).toBe(true);
  });
  test('one payment unpaid for 7 days blocks', () => {
    expect(publishBlocked([due(7 * 24 - 1)], NOW)).toBe(false);
    expect(publishBlocked([due(7 * 24)], NOW)).toBe(true);
  });
  test('settling lifts the block', () => {
    expect(publishBlocked([{ ...due(200), state: 'settled' }], NOW)).toBe(false);
  });
});

describe('reminderDue', () => {
  test('reminds at 24 h and 72 h, once each', () => {
    expect(reminderDue(due(23), NOW, [])).toBeNull();
    expect(reminderDue(due(24), NOW, [])).toBe(24);
    expect(reminderDue(due(30), NOW, [24])).toBeNull();
    expect(reminderDue(due(72), NOW, [24])).toBe(72);
    expect(reminderDue(due(100), NOW, [24, 72])).toBeNull();
  });
  test('a missed 24 h reminder is folded into the 72 h one', () => {
    expect(reminderDue(due(80), NOW, [])).toBe(72);
  });
  test('only due payments are reminded', () => {
    expect(reminderDue({ ...due(30), state: 'marked_paid' }, NOW, [])).toBeNull();
  });
});

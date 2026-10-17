import { describe, expect, test } from 'bun:test';

import {
  firstRecheckDue,
  isRecheckDue,
  sortMethods,
  withAdded,
  withDefault,
  withRemoved,
  type PayeeMethod,
} from './methods';

const NOW = new Date('2026-10-15T12:00:00Z');
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();

function method(id: string, details: Partial<PayeeMethod> = {}): PayeeMethod {
  return {
    id,
    type: 'duitnow_id',
    phone: '+60123456789',
    displayName: 'LIM WEI JIE',
    isDefault: false,
    createdAt: `2026-10-0${id}T00:00:00Z`,
    checkedAt: NOW.toISOString(),
    ...details,
  } as PayeeMethod;
}

const cash = (id: string) => method(id, { type: 'cash' } as Partial<PayeeMethod>);
const qr = (id: string, checkedAt: string) =>
  method(id, {
    type: 'alipay',
    payload: 'https://qr.alipay.com/x',
    displayName: 'LIM WEI JIE',
    checkedAt,
  } as never);
const defaults = (methods: PayeeMethod[]) => methods.filter((m) => m.isDefault).map((m) => m.id);

describe('default method', () => {
  test('the first transfer method becomes the default', () => {
    expect(defaults(withAdded([], method('1')))).toEqual(['1']);
  });

  test('later methods do not take the default', () => {
    const one = withAdded([], method('1'));
    expect(defaults(withAdded(one, method('2')))).toEqual(['1']);
  });

  test('cash is never the default, even when added first', () => {
    const list = withAdded([], cash('1'));
    expect(defaults(list)).toEqual([]);
    expect(defaults(withAdded(list, method('2')))).toEqual(['2']);
    expect(defaults(withDefault(withAdded(list, method('2')), '1'))).toEqual(['2']);
  });

  test('changing the default leaves exactly one', () => {
    const list = withAdded(withAdded([], method('1')), method('2'));
    expect(defaults(withDefault(list, '2'))).toEqual(['2']);
  });

  test('removing the default promotes the oldest remaining transfer method', () => {
    let list = withAdded([], method('1'));
    list = withAdded(list, cash('2'));
    list = withAdded(list, method('3'));
    list = withAdded(list, method('4'));
    expect(defaults(withRemoved(list, '1'))).toEqual(['3']);
  });

  test('removing a non-default keeps the default', () => {
    const list = withAdded(withAdded([], method('1')), method('2'));
    expect(defaults(withRemoved(list, '2'))).toEqual(['1']);
  });

  test('the default sorts first, then by age', () => {
    const list = withDefault(withAdded(withAdded([], method('1')), method('2')), '2');
    expect(sortMethods(list).map((m) => m.id)).toEqual(['2', '1']);
  });
});

describe('re-check', () => {
  test('a QR method is due after 90 days', () => {
    expect(isRecheckDue(qr('1', daysAgo(90)), NOW)).toBe(false);
    expect(isRecheckDue(qr('1', daysAgo(91)), NOW)).toBe(true);
  });

  test('phone, bank and cash are never due', () => {
    expect(isRecheckDue(method('1', { checkedAt: daysAgo(400) }), NOW)).toBe(false);
    expect(isRecheckDue({ ...cash('2'), checkedAt: daysAgo(400) }, NOW)).toBe(false);
  });

  test('finds the first due method', () => {
    const list = [qr('1', daysAgo(10)), qr('2', daysAgo(120))];
    expect(firstRecheckDue(list, NOW)?.id).toBe('2');
    expect(firstRecheckDue([qr('1', daysAgo(10))], NOW)).toBeNull();
  });
});

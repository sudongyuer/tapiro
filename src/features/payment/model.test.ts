import { describe, expect, test } from 'bun:test';

import type { PayeeMethod } from '@/lib/payeeMethods';

import { convertedAt, freshRate, pairedReference } from './fx';
import { confirmedLink, initialSelection, payOptions, WALLET_LINKS } from './payOptions';
import { isReference, newReference, REFERENCE_ALPHABET } from './reference';
import { availableActions, nextState, sheetTitleKey } from './stateMachine';

const base = {
  isDefault: false,
  createdAt: '2026-10-01T00:00:00Z',
  checkedAt: '2026-10-01T00:00:00Z',
};
const METHODS: PayeeMethod[] = [
  { ...base, id: 'cash', type: 'cash' },
  {
    ...base,
    id: 'bank',
    type: 'bank_account',
    bankCode: '588734',
    bankName: null,
    accountNumber: '1234564821',
    displayName: 'LIM',
  },
  {
    ...base,
    id: 'phone',
    type: 'duitnow_id',
    phone: '+60123456789',
    displayName: 'LIM',
    isDefault: true,
  },
  {
    ...base,
    id: 'maybank-qr',
    type: 'duitnow_qr',
    payload: 'q1',
    acquirerId: '588734',
    mcc: '0000',
    name: 'LIM',
  },
  {
    ...base,
    id: 'tng',
    type: 'duitnow_qr',
    payload: 'q2',
    acquirerId: '890053',
    mcc: '0000',
    name: 'LIM',
  },
  { ...base, id: 'wechat', type: 'wechat', payload: 'wxp://x', displayName: 'LIM' },
  { ...base, id: 'alipay', type: 'alipay', payload: 'https://qr.alipay.com/x', displayName: 'LIM' },
];

describe('payment state machine', () => {
  const payer = { role: 'payer', payeeTakesCash: false } as const;
  const payee = { role: 'payee', payeeTakesCash: false } as const;

  test('due → marked_paid → settled through the payer then the payee', () => {
    expect(nextState('markPaid', { ...payer, state: 'due' })).toBe('marked_paid');
    expect(nextState('confirm', { ...payee, state: 'marked_paid' })).toBe('settled');
  });

  test('the payer undoes 我已付款 only before the payee confirms', () => {
    expect(nextState('undo', { ...payer, state: 'marked_paid' })).toBe('due');
    expect(nextState('undo', { ...payer, state: 'settled' })).toBeNull();
    expect(nextState('undo', { ...payee, state: 'marked_paid' })).toBeNull();
  });

  test('还没收到 keeps the payment marked paid', () => {
    expect(nextState('notReceived', { ...payee, state: 'marked_paid' })).toBe('marked_paid');
    expect(nextState('notReceived', { ...payee, state: 'due' })).toBeNull();
  });

  test('cash settles from due on the payee alone; the payer never marks cash paid', () => {
    expect(nextState('confirm', { ...payee, state: 'due' })).toBeNull();
    expect(nextState('confirm', { ...payee, payeeTakesCash: true, state: 'due' })).toBe('settled');
    expect(nextState('markPaid', { ...payer, state: 'due', methodIsCash: true })).toBeNull();
  });

  test('nothing changes a settled or disputed payment', () => {
    for (const state of ['settled', 'disputed'] as const) {
      expect(availableActions({ ...payer, state })).toEqual([]);
      expect(availableActions({ ...payee, payeeTakesCash: true, state })).toEqual([]);
    }
  });
});

test('the payee sees 收款 as the sheet title, the payer 付款, and an unknown role no title', () => {
  expect(sheetTitleKey('payee')).toBe('pay.sheet.titlePayee');
  expect(sheetTitleKey('payer')).toBe('pay.sheet.title');
  expect(sheetTitleKey(null)).toBeNull();
});

describe('reference', () => {
  test('TP- plus four characters, never 0, O, 1 or I', () => {
    expect(REFERENCE_ALPHABET).not.toMatch(/[0O1I]/);
    expect(REFERENCE_ALPHABET).toHaveLength(32);
    expect(isReference('TP-8K2Q')).toBe(true);
    expect(isReference('TP-8K0Q')).toBe(false);
    expect(isReference('TP-8KIQ')).toBe(false);
  });

  test('a new reference skips ones the payee already has open', () => {
    const sequence = [0, 0, 0, 0, 0, 0, 0, 0.99];
    let i = 0;
    const reference = newReference(new Set(['TP-AAAA']), () => sequence[i++]);
    expect(reference).toBe('TP-AAA9');
  });
});

describe('pay options', () => {
  test('wallets come first: Alipay, WeChat, TNG, other DuitNow QR, phone, bank, cash', () => {
    expect(payOptions(METHODS).map((option) => option.id)).toEqual([
      'alipay',
      'wechat',
      'tng',
      'maybank-qr',
      'phone',
      'bank',
      'cash',
    ]);
  });

  test('a single method is preselected; several wait for a choice', () => {
    expect(initialSelection(payOptions([METHODS[2]]))).toBe('phone');
    expect(initialSelection(payOptions(METHODS))).toBeNull();
    expect(initialSelection([])).toBeNull();
  });

  test('a payer copies the full number, in the format banks accept', () => {
    const [phone, bank] = payOptions([METHODS[2], METHODS[1]]);
    expect(phone).toMatchObject({ display: '+60 12-345 6789', copyValue: '0123456789' });
    expect(bank).toMatchObject({ bank: 'Maybank', copyValue: '1234564821' });
  });

  test('no wallet link opens until it is confirmed on a device', () => {
    expect(Object.values(WALLET_LINKS).every((link) => !link.confirmed)).toBe(true);
    expect(confirmedLink('alipay')).toBeNull();
    expect(confirmedLink(null)).toBeNull();
  });
});

describe('reference in the other currency', () => {
  const rate = {
    base: 'CNY' as const,
    quote: 'MYR' as const,
    quotePerBase: 0.6122,
    rateDate: '2026-10-23',
    source: 'bnm',
  };
  const now = new Date('2026-10-25T10:00:00+08:00');
  const ringgit = (minor: number) => ({ minor, currency: 'MYR' as const });

  test('converts RM to yuan at the daily rate and rounds up to the fen', () => {
    expect(convertedAt(ringgit(1500), 'CNY', rate, now)).toEqual({ minor: 2451, currency: 'CNY' });
    expect(convertedAt(ringgit(1), 'CNY', rate, now)).toEqual({ minor: 2, currency: 'CNY' });
    expect(pairedReference(ringgit(800), rate, now)).toEqual({ minor: 1307, currency: 'CNY' });
  });

  test("shows no reference in the amount's own currency", () => {
    expect(convertedAt(ringgit(1500), 'MYR', rate, now)).toBeNull();
  });

  test('hides the reference when no rate is newer than 7 days', () => {
    expect(freshRate(rate, new Date('2026-10-29T23:00:00+08:00'))).toEqual(rate);
    expect(freshRate(rate, new Date('2026-10-30T00:00:01+08:00'))).toBeNull();
    expect(convertedAt(ringgit(1500), 'CNY', null, now)).toBeNull();
    expect(pairedReference(ringgit(1500), null, now)).toBeNull();
  });
});

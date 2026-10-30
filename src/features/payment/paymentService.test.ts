import { describe, expect, test } from 'bun:test';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  createSupabasePaymentService,
  toPayment,
  toPaymentDetail,
  type PaymentRow,
} from './paymentService';
import { NoRateError } from './types';

function settling(data: unknown) {
  const client = { rpc: async () => ({ data, error: null }) } as unknown as SupabaseClient;
  return createSupabasePaymentService(client).confirm('payment-1');
}

describe('settle result', () => {
  test('passes the server count through', async () => {
    expect(await settling({ state: 'settled', firstSettled: true, stickerCount: 1 })).toEqual({
      firstSettled: true,
      stickerCount: 1,
    });
  });

  test('a missing or malformed count is unknown, never a guessed number', async () => {
    for (const stickerCount of [undefined, null, '3', 2.5, -1, 0]) {
      expect(await settling({ state: 'settled', firstSettled: false, stickerCount })).toEqual({
        firstSettled: false,
        stickerCount: null,
      });
    }
  });
});

describe('payment rows', () => {
  const row: PaymentRow = {
    id: 'payment-1',
    item_kind: 'bounty',
    category: 'buy',
    title: '帮带一杯咖啡',
    amount_minor: 800,
    currency: 'MYR',
    paid_minor: null,
    paid_currency: null,
    reference: 'TP-3MZ7',
    state: 'due',
    payer_id: 'payer-1',
    payee_id: 'payee-1',
    method_type: null,
    proof_path: null,
    nudged_at: null,
    marked_paid_at: null,
    created_at: '2026-10-26T00:00:00Z',
    reverses: null,
  };

  test('maps the bounty category, and an unknown category becomes none', () => {
    expect(toPayment('payee-1', row, {})?.category).toBe('buy');
    expect(toPayment('payee-1', { ...row, category: 'parcel' }, {})?.category).toBeNull();
    expect(toPayment('payee-1', { ...row, category: null }, {})?.category).toBeNull();
  });

  test('carries the amount and the paid amount with their currencies', () => {
    expect(toPayment('payee-1', row, {})).toMatchObject({
      amount: { minor: 800, currency: 'MYR' },
      paid: null,
    });
    const paid = { ...row, state: 'marked_paid' as const, paid_minor: 1307, paid_currency: 'CNY' };
    expect(toPayment('payee-1', paid, {})?.paid).toEqual({ minor: 1307, currency: 'CNY' });
  });

  test('rejects a row in an unknown currency instead of showing it as ringgit', () => {
    expect(toPayment('payee-1', { ...row, currency: 'USD' }, {})).toBeNull();
  });
});

describe('payment detail', () => {
  const detail = {
    id: 'payment-1',
    amountMinor: 5000,
    currency: 'CNY',
    rate: { base: 'CNY', quote: 'MYR', quotePerBase: 0.6494, date: '2026-10-28', source: 'bnm' },
    paidMinor: null,
    paidCurrency: null,
    art: 'parcel',
    methods: [
      { method: 'm-1', type: 'duitnow_id', currency: 'MYR', amountMinor: 3247 },
      { method: 'm-2', type: 'alipay', currency: 'CNY', amountMinor: 5000 },
    ],
  };

  test('maps the locked rate and each method amount', () => {
    expect(toPaymentDetail(detail)).toEqual({
      rate: {
        base: 'CNY',
        quote: 'MYR',
        quotePerBase: 0.6494,
        rateDate: '2026-10-28',
        source: 'bnm',
      },
      methods: [
        {
          methodId: 'm-1',
          type: 'duitnow_id',
          currency: 'MYR',
          amount: { minor: 3247, currency: 'MYR' },
        },
        {
          methodId: 'm-2',
          type: 'alipay',
          currency: 'CNY',
          amount: { minor: 5000, currency: 'CNY' },
        },
      ],
      art: 'parcel',
    });
  });

  test('an art that is not a non-empty string reads as null', () => {
    expect(toPaymentDetail({ ...detail, art: 42 })?.art).toBeNull();
    expect(toPaymentDetail({ ...detail, art: '' })?.art).toBeNull();
  });

  test('no locked rate leaves the converted method without an amount', () => {
    const parsed = toPaymentDetail({
      ...detail,
      rate: null,
      methods: [{ method: 'm-1', type: 'duitnow_id', currency: 'MYR', amountMinor: null }],
    });
    expect(parsed).toEqual({
      rate: null,
      methods: [{ methodId: 'm-1', type: 'duitnow_id', currency: 'MYR', amount: null }],
      art: 'parcel',
    });
  });

  test('rejects an unknown currency or method type instead of guessing', () => {
    const method = detail.methods[0];
    expect(toPaymentDetail({ ...detail, methods: [{ ...method, currency: 'USD' }] })).toBeNull();
    expect(toPaymentDetail({ ...detail, methods: [{ ...method, type: 'paypal' }] })).toBeNull();
    expect(toPaymentDetail({ ...detail, rate: { ...detail.rate, base: 'USD' } })).toBeNull();
    expect(toPaymentDetail(null)).toBeNull();
  });

  test('the service reads payment_detail and fails on an unreadable answer', async () => {
    const reading = (data: unknown) =>
      createSupabasePaymentService({
        rpc: async (name: string) => ({
          data: name === 'payment_detail' ? data : null,
          error: null,
        }),
      } as unknown as SupabaseClient).detail('payment-1');
    expect((await reading(detail)).methods).toHaveLength(2);
    await expect(reading({ methods: 'none' })).rejects.toBeDefined();
  });
});

describe('mark paid', () => {
  const failing = (error: unknown) =>
    createSupabasePaymentService({
      rpc: async () => ({ data: null, error }),
    } as unknown as SupabaseClient);

  test('maps no_rate to a typed error', async () => {
    const marking = failing({ code: '55000', message: 'no_rate' }).markPaid('p', 'm', null);
    await expect(marking).rejects.toBeInstanceOf(NoRateError);
  });

  test('passes any other failure through', async () => {
    const error = { code: '55000', message: 'payment is not due' };
    await expect(failing(error).markPaid('p', 'm', null)).rejects.toBe(error);
  });
});

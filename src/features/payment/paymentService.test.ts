import { describe, expect, test } from 'bun:test';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  createSupabasePaymentService,
  toFxRate,
  toPayment,
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

describe('fx rates', () => {
  test('maps a rate row and rejects an unknown pair', () => {
    const rate = {
      base: 'CNY',
      quote: 'MYR',
      quote_per_base: '0.61220000',
      rate_date: '2026-10-23',
      source: 'bnm',
    };
    expect(toFxRate(rate)).toEqual({
      base: 'CNY',
      quote: 'MYR',
      quotePerBase: 0.6122,
      rateDate: '2026-10-23',
      source: 'bnm',
    });
    expect(toFxRate({ ...rate, base: 'USD' })).toBeNull();
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

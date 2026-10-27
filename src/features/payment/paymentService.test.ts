import { describe, expect, test } from 'bun:test';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createSupabasePaymentService, toPayment, type PaymentRow } from './paymentService';

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
    amount_sen: 800,
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
});

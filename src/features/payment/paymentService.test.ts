import { describe, expect, test } from 'bun:test';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createSupabasePaymentService } from './paymentService';

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

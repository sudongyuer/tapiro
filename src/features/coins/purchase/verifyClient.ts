import type { SupabaseClient } from '@supabase/supabase-js';

import type { VerifyAnswer } from './forward';

const OK_STATUSES = new Set(['credited', 'duplicate', 'revoked']);

export function createVerifyClient(client: SupabaseClient) {
  return async function verify(signedTransaction: string): Promise<VerifyAnswer> {
    const { data, error } = await client.functions.invoke('iap-verify', {
      method: 'POST',
      body: { signedTransaction },
    });
    if (error) {
      const response = (error as { context?: unknown }).context;
      if (response instanceof Response) {
        const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
        return {
          ok: false,
          httpStatus: response.status,
          error: typeof body?.error === 'string' ? body.error : 'unknown',
        };
      }
      return { ok: false, httpStatus: null, error: 'network' };
    }
    const status = (data as { status?: unknown } | null)?.status;
    if (typeof status !== 'string' || !OK_STATUSES.has(status)) {
      return { ok: false, httpStatus: 200, error: 'unexpected_answer' };
    }
    const { balance, coins } = data as { balance?: unknown; coins?: unknown };
    return {
      ok: true,
      status: status as 'credited' | 'duplicate' | 'revoked',
      balance: typeof balance === 'number' ? balance : null,
      coins: Number.isInteger(coins) ? Number(coins) : null,
    };
  };
}

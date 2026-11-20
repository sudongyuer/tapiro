import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { localSupabase } from '../../../scripts/local-supabase';

const url = localSupabase('API_URL');
const serviceKey = localSupabase('SERVICE_ROLE_KEY');
const localEnv = readFileSync(new URL('../local.env', import.meta.url), 'utf8');
const cronSecret = localEnv.match(/^CRON_SECRET=(.+)$/m)?.[1];

function call(name: string, headers: Record<string, string>) {
  return fetch(`${url}/functions/v1/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: '{}',
  });
}

describe('scheduled functions behind the cron secret', () => {
  test('local.env sets a cron secret', () => {
    expect(cronSecret?.length).toBeGreaterThan(0);
  });

  for (const name of ['payment-proof-cleanup', 'notify']) {
    test(`${name} runs for the cron secret without a Supabase JWT`, async () => {
      const res = await call(name, { 'x-cron-secret': cronSecret! });
      expect(res.status).toBe(200);
    });
  }

  for (const name of ['payment-proof-cleanup', 'notify', 'fx-rate']) {
    test(`${name} rejects a missing or wrong secret and the service role key`, async () => {
      const missing = await call(name, {});
      const wrong = await call(name, { 'x-cron-secret': `${cronSecret}x` });
      const bearer = await call(name, { Authorization: `Bearer ${serviceKey}` });
      expect([missing.status, wrong.status, bearer.status]).toEqual([401, 401, 401]);
      expect(await wrong.json()).toEqual({ error: 'unauthorized' });
    });
  }
});

import { afterAll, describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

import { localDb } from '../../../scripts/local-db';
import { localSupabase } from '../../../scripts/local-supabase';
import { TEST_RATES_HEADER } from '../fx-rate/handler';

const url = localSupabase('API_URL');
const localEnv = readFileSync(new URL('../local.env', import.meta.url), 'utf8');
const cronSecret = localEnv.match(/^CRON_SECRET=(.+)$/m)?.[1];
const mockPort = Number(new URL(localEnv.match(/^FX_TEST_RATES_URL=(.+)$/m)![1]).port);
const RATE_DATE = '2099-01-02';
const db = localDb();

const bnm = Bun.serve({
  port: mockPort,
  hostname: '0.0.0.0',
  fetch: () =>
    Response.json({
      data: [
        {
          currency_code: 'CNY',
          unit: 1,
          rate: { date: RATE_DATE, buying_rate: 0.6119, selling_rate: 0.6125, middle_rate: 0.6122 },
        },
      ],
      meta: { quote: 'rm', session: '1130' },
    }),
});

afterAll(async () => {
  await db`delete from public.fx_rates where rate_date = ${RATE_DATE}`;
  bnm.stop(true);
});

describe('fx-rate on the local stack', () => {
  test('stores the BNM rate through the service role, and a second run updates it', async () => {
    for (let run = 0; run < 2; run++) {
      const res = await fetch(`${url}/functions/v1/fx-rate`, {
        method: 'POST',
        headers: { 'x-cron-secret': cronSecret!, [TEST_RATES_HEADER]: '1' },
      });
      expect(await res.json()).toMatchObject({ rateDate: RATE_DATE, quotePerBase: 0.6122 });
      expect(res.status).toBe(200);
    }
    const rows = await db`
      select base, quote, source, session, quote_per_base::float8 as rate
      from public.fx_rates where rate_date = ${RATE_DATE}`;
    expect([...rows]).toEqual([
      { base: 'CNY', quote: 'MYR', source: 'bnm', session: '1130', rate: 0.6122 },
    ]);
  });
});

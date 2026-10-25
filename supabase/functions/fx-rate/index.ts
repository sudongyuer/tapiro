import { createClient } from 'npm:@supabase/supabase-js@2';

import { BNM_ACCEPT, BNM_RATES_URL, handleFxRate } from './handler.ts';

const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

Deno.serve((req) =>
  handleFxRate(req, {
    authorized: (token) => token === serviceKey,
    async fetchRates() {
      const res = await fetch(BNM_RATES_URL, { headers: { Accept: BNM_ACCEPT } });
      if (!res.ok) throw new Error(`BNM answered ${res.status}`);
      return res.json();
    },
    async store(rate) {
      const { error } = await admin.from('fx_rates').upsert(
        {
          rate_date: rate.rateDate,
          session: rate.session,
          rm_per_cny: rate.rmPerCny,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: 'rate_date' },
      );
      if (error) throw error;
    },
  }),
);

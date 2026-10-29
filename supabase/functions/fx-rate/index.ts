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
          base: rate.base,
          quote: rate.quote,
          rate_date: rate.rateDate,
          source: rate.source,
          session: rate.session,
          quote_per_base: rate.quotePerBase,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: 'base,quote,rate_date,source' },
      );
      if (error) throw error;
    },
  }),
);

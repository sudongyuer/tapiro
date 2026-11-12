import { createClient } from 'npm:@supabase/supabase-js@2';

import { handleAiDraft } from './handler.ts';
import { localTestProvider, providerFor, providerFromEnv } from './providerConfig.ts';
import { rpcStore } from './store.ts';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const env = (key: string) => Deno.env.get(key);
const configured = providerFromEnv(env);
const test = localTestProvider(env);
const store = rpcStore(admin);

Deno.serve((req) =>
  handleAiDraft(req, {
    async userIdFromToken(token) {
      const { data, error } = await admin.auth.getUser(token);
      return error ? null : (data.user?.id ?? null);
    },
    store,
    provider: providerFor(req, configured, test),
  }),
);

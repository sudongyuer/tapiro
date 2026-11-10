import { createClient } from 'npm:@supabase/supabase-js@2';

import { config, verifiers } from '../_shared/iap/runtime.ts';
import { rpcIapStore } from '../_shared/iap/store.ts';
import { handleIapVerify } from './handler.ts';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const store = rpcIapStore(admin);

Deno.serve((req) =>
  handleIapVerify(req, {
    async userIdFromToken(token) {
      const { data, error } = await admin.auth.getUser(token);
      return error ? null : (data.user?.id ?? null);
    },
    verifyTransaction: verifiers.transaction,
    store,
    config,
  }),
);

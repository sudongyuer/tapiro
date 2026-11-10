import { createClient } from 'npm:@supabase/supabase-js@2';

import { config, verifiers } from '../_shared/iap/runtime.ts';
import { rpcIapStore } from '../_shared/iap/store.ts';
import { handleIapNotify } from './handler.ts';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

Deno.serve((req) =>
  handleIapNotify(req, {
    verifyNotification: verifiers.notification,
    verifyTransaction: verifiers.transaction,
    store: rpcIapStore(admin),
    config,
  }),
);

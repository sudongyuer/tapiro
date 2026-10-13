import { createClient } from 'npm:@supabase/supabase-js@2';

import { handleAccountDelete, type UnsettledPayment } from './handler.ts';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// No payments table exists yet, so nothing can be unsettled. This is the only place the
// deletion block reads payments.
async function findUnsettledPayments(_userId: string): Promise<UnsettledPayment[]> {
  return [];
}

Deno.serve((req) =>
  handleAccountDelete(req, {
    async userIdFromToken(token) {
      const { data, error } = await admin.auth.getUser(token);
      return error ? null : (data.user?.id ?? null);
    },
    findUnsettledPayments,
    async deleteUser(userId) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw error;
    },
  }),
);

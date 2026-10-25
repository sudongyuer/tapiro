import { createClient } from 'npm:@supabase/supabase-js@2';

import {
  handleAccountDelete,
  toUnsettledPayments,
  type UnsettledPayment,
  type UnsettledRow,
} from './handler.ts';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function findUnsettledPayments(userId: string): Promise<UnsettledPayment[]> {
  const { data, error } = await admin
    .from('payments')
    .select('id, title, amount_sen, payer_id, payee_id')
    .neq('state', 'settled')
    .or(`payer_id.eq.${userId},payee_id.eq.${userId}`)
    .order('created_at')
    .returns<UnsettledRow[]>();
  if (error) throw error;
  const rows = data ?? [];
  const ids = [...new Set(rows.flatMap((row) => [row.payer_id, row.payee_id]))].filter(
    (id): id is string => id !== null && id !== userId,
  );
  const names: Record<string, string> = {};
  if (ids.length > 0) {
    const profiles = await admin.from('profiles').select('id, display_name').in('id', ids);
    if (profiles.error) throw profiles.error;
    for (const profile of profiles.data ?? []) names[profile.id] = profile.display_name;
  }
  return toUnsettledPayments(userId, rows, names);
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

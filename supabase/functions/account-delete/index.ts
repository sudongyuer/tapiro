import { createClient } from 'npm:@supabase/supabase-js@2';

import {
  handleAccountDelete,
  toActiveBounties,
  toUnsettledPayments,
  type ActiveBounty,
  type ActiveBountyRow,
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
  const names = await displayNames(
    rows.flatMap((row) => [row.payer_id, row.payee_id]),
    userId,
  );
  return toUnsettledPayments(userId, rows, names);
}

async function findActiveBounties(userId: string): Promise<ActiveBounty[]> {
  const { data, error } = await admin
    .rpc('active_bounties_of', { uid: userId })
    .returns<ActiveBountyRow[]>();
  if (error) throw error;
  const rows = data ?? [];
  const names = await displayNames(
    rows.map((row) => row.counterpart_id),
    userId,
  );
  return toActiveBounties(rows, names);
}

async function displayNames(
  candidates: readonly (string | null)[],
  userId: string,
): Promise<Record<string, string>> {
  const ids = [...new Set(candidates)].filter((id): id is string => id !== null && id !== userId);
  const names: Record<string, string> = {};
  if (ids.length > 0) {
    const profiles = await admin.from('profiles').select('id, display_name').in('id', ids);
    if (profiles.error) throw profiles.error;
    for (const profile of profiles.data ?? []) names[profile.id] = profile.display_name;
  }
  return names;
}

Deno.serve((req) =>
  handleAccountDelete(req, {
    async userIdFromToken(token) {
      const { data, error } = await admin.auth.getUser(token);
      return error ? null : (data.user?.id ?? null);
    },
    findUnsettledPayments,
    findActiveBounties,
    async deleteUser(userId) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw error;
    },
  }),
);

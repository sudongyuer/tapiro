import type { SupabaseClient } from '@supabase/supabase-js';

import { isUnpaid } from '@/lib/unpaid';

import { toFailure } from './publishError';
import type { PostService, PostStatus, PublishResult, UnpaidSummary } from './types';

type UnpaidRow = {
  id: string;
  payee_id: string | null;
  amount_sen: number;
  state: 'due' | 'marked_paid' | 'settled' | 'disputed';
  nudged_at: string | null;
  created_at: string;
};

const isCount = (value: unknown): value is number => Number.isInteger(value) && Number(value) >= 0;

function unwrap<T extends { error: unknown }>(result: T) {
  if (result.error) throw result.error;
  return result;
}

export function toBalance(value: unknown) {
  const body = (value ?? {}) as Record<string, unknown>;
  const { coins, freePostsLeft, freePostsPerMonth, nextFreeAt } = body;
  if (
    !isCount(coins) ||
    !isCount(freePostsLeft) ||
    !isCount(freePostsPerMonth) ||
    typeof nextFreeAt !== 'string' ||
    Number.isNaN(Date.parse(nextFreeAt))
  ) {
    throw new Error('coin_balance returned an unexpected shape');
  }
  return { coins, freePostsLeft, freePostsPerMonth, nextFreeAt };
}

export function toPublishResult(value: unknown): PublishResult | null {
  const body = (value ?? {}) as Record<string, unknown>;
  const { id, status, charge, expiresAt } = body;
  if (typeof id !== 'string' || typeof status !== 'string' || typeof expiresAt !== 'string') {
    return null;
  }
  if (charge !== 'free' && charge !== 'coin') return null;
  return { id, status, charge, expiresAt };
}

export function createSupabasePostService(client: SupabaseClient | null): PostService {
  const db = () => {
    if (!client) throw new Error('Supabase is not configured');
    return client;
  };

  async function unpaid(userId: string): Promise<UnpaidSummary[]> {
    const { data } = unwrap(
      await db()
        .from('payments')
        .select('id, payee_id, amount_sen, state, nudged_at, created_at')
        .eq('payer_id', userId)
        .in('state', ['due', 'marked_paid'])
        .order('created_at')
        .returns<UnpaidRow[]>(),
    );
    const rows = (data ?? []).filter((row) =>
      isUnpaid({ state: row.state, nudgedAt: row.nudged_at, createdAt: row.created_at }),
    );
    const payeeIds = [
      ...new Set(rows.flatMap((row) => (row.payee_id === null ? [] : [row.payee_id]))),
    ];
    const names: Record<string, string> = {};
    if (payeeIds.length > 0) {
      const profiles = unwrap(
        await db().from('profiles').select('id, display_name').in('id', payeeIds),
      );
      for (const profile of profiles.data ?? []) names[profile.id] = profile.display_name;
    }
    return rows.map((row) => ({
      paymentId: row.id,
      payeeName: (row.payee_id && names[row.payee_id]) || '',
      amountSen: row.amount_sen,
      createdAt: row.created_at,
    }));
  }

  return {
    async status(): Promise<PostStatus> {
      const { data } = await db().auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) throw new Error('Not signed in');
      const [blocked, balance, owed] = await Promise.all([
        db().rpc('publish_blocked'),
        db().rpc('coin_balance'),
        unpaid(userId),
      ]);
      const isBlocked = unwrap(blocked).data as unknown;
      if (typeof isBlocked !== 'boolean') throw new Error('publish_blocked returned no boolean');
      return { blocked: isBlocked, unpaid: owed, ...toBalance(unwrap(balance).data) };
    },
    async isPublished(id) {
      const { data } = unwrap(await db().from('bounties').select('id').eq('id', id).maybeSingle());
      return data !== null;
    },
    async publish(args) {
      try {
        const { data, error } = await db().rpc('publish_bounty', args);
        if (error) return { ok: false, reason: toFailure(error) };
        const result = toPublishResult(data);
        return result ? { ok: true, result } : { ok: false, reason: 'failed' };
      } catch (error) {
        return { ok: false, reason: toFailure(error) };
      }
    },
  };
}

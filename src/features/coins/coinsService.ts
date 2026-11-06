import type { SupabaseClient } from '@supabase/supabase-js';

import {
  inviteCodeShaped,
  normalizeInviteCode,
  toBalance,
  toFeedResult,
  toFeedStatus,
  toHistoryPage,
  toInvite,
} from './parse';
import { HISTORY_PAGE_SIZE, type CoinsService, type RedeemFailure } from './types';

const REDEEM_FAILURES: Readonly<Record<string, RedeemFailure>> = {
  code_not_found: 'notFound',
  own_code: 'ownCode',
  already_redeemed: 'alreadyRedeemed',
  too_late: 'tooLate',
  mutual_invite: 'mutual',
};

export function toRedeemFailure(error: unknown): RedeemFailure {
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === 'string' && Object.hasOwn(REDEEM_FAILURES, message)
    ? REDEEM_FAILURES[message]
    : 'failed';
}

function unwrap<T extends { data: unknown; error: unknown }>(result: T): T['data'] {
  if (result.error) throw result.error;
  return result.data;
}

export function createSupabaseCoinsService(client: SupabaseClient | null): CoinsService {
  const db = () => {
    if (!client) throw new Error('Supabase is not configured');
    return client;
  };
  return {
    async balance() {
      return toBalance(unwrap(await db().rpc('coin_balance')));
    },
    async history(before) {
      return toHistoryPage(
        unwrap(await db().rpc('coin_history', { before, max_count: HISTORY_PAGE_SIZE })),
      );
    },
    async feedStatus() {
      return toFeedStatus(unwrap(await db().rpc('weekly_feed_status')));
    },
    async feed() {
      return toFeedResult(unwrap(await db().rpc('feed_weekly')));
    },
    async invite() {
      return toInvite(unwrap(await db().rpc('my_invite')));
    },
    async redeem(typed) {
      if (!inviteCodeShaped(typed)) return { ok: false, failure: 'malformed' };
      try {
        const { data, error } = await db().rpc('redeem_invite', {
          code: normalizeInviteCode(typed),
        });
        if (error) return { ok: false, failure: toRedeemFailure(error) };
        return { ok: true, invite: toInvite(data) };
      } catch {
        return { ok: false, failure: 'failed' };
      }
    },
  };
}

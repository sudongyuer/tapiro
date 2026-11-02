import type { SupabaseClient } from '@supabase/supabase-js';

import type { CurrencyCode } from '@/lib/money';

import { toHistory, toMyRides, toNearbyPage, toShortNameRows } from './parse';
import type { PublishRideFailure, RidePostStatus, RideService } from './types';

const PAGE_SIZE = 50;

const FAILURES: Readonly<Record<string, PublishRideFailure>> = {
  publish_blocked: 'blocked',
  no_balance: 'noBalance',
  no_payee_method: 'noPayee',
  invalid_ride: 'invalid',
  post_already_sent: 'alreadySent',
};

export function toPublishFailure(error: unknown): PublishRideFailure {
  if (typeof error !== 'object' || error === null) return 'failed';
  const { message } = error as { message?: unknown };
  return typeof message === 'string' && Object.hasOwn(FAILURES, message)
    ? FAILURES[message]
    : 'failed';
}

const isCount = (value: unknown): value is number => Number.isInteger(value) && Number(value) >= 0;

export function toPostStatus(blocked: unknown, balance: unknown, payees: unknown): RidePostStatus {
  const body = (balance ?? {}) as Record<string, unknown>;
  const { coins, freePostsLeft, freePostsPerMonth, nextFreeAt } = body;
  if (
    typeof blocked !== 'boolean' ||
    !isCount(coins) ||
    !isCount(freePostsLeft) ||
    !isCount(freePostsPerMonth) ||
    typeof nextFreeAt !== 'string' ||
    !isCount(payees)
  ) {
    throw new Error('ride post status has an unexpected shape');
  }
  return { blocked, coins, freePostsLeft, freePostsPerMonth, nextFreeAt, hasPayee: payees > 0 };
}

function unwrap<T extends { data: unknown; error: unknown }>(result: T): T['data'] {
  if (result.error) throw result.error;
  return result.data;
}

export function createSupabaseRideService(
  client: SupabaseClient | null,
  referenceCurrency: () => CurrencyCode,
): RideService {
  const db = () => {
    if (!client) throw new Error('Supabase is not configured');
    return client;
  };
  return {
    async nearby(point, after) {
      const data = unwrap(
        await db().rpc('nearby_rides', {
          latitude: point?.latitude ?? null,
          longitude: point?.longitude ?? null,
          page_after: after,
          page_size: PAGE_SIZE,
          reference_currency: referenceCurrency(),
        }),
      );
      return toNearbyPage(data);
    },
    async mine() {
      return toMyRides(
        unwrap(await db().rpc('my_rides', { reference_currency: referenceCurrency() })),
      );
    },
    async history() {
      return toHistory(
        unwrap(await db().rpc('ride_history', { reference_currency: referenceCurrency() })),
      );
    },
    async shortNames() {
      return toShortNameRows(
        unwrap(await db().from('place_short_names').select('pattern, short_name, kind')),
      );
    },
    async postStatus() {
      const [blocked, balance, payees] = await Promise.all([
        db().rpc('publish_blocked'),
        db().rpc('coin_balance'),
        db().from('payee_methods').select('id', { count: 'exact', head: true }),
      ]);
      if (payees.error) throw payees.error;
      return toPostStatus(unwrap(blocked), unwrap(balance), payees.count);
    },
    async publish(args) {
      try {
        const { data, error } = await db().rpc('publish_ride', args);
        if (error) return { ok: false, reason: toPublishFailure(error) };
        const body = (data ?? {}) as { id?: unknown; charge?: unknown };
        if (typeof body.id !== 'string' || (body.charge !== 'free' && body.charge !== 'coin')) {
          return { ok: false, reason: 'failed' };
        }
        return { ok: true, id: body.id, charge: body.charge };
      } catch (error) {
        return { ok: false, reason: toPublishFailure(error) };
      }
    },
  };
}

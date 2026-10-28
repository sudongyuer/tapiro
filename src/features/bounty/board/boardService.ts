import type { SupabaseClient } from '@supabase/supabase-js';

import type { Point } from '@/lib/location/types';

import { toBoardPage, toBountyDetail } from './parse';
import {
  originPoint,
  type ApplyFailure,
  type BoardFilter,
  type BoardOrigin,
  type BoardPage,
  type BoardService,
} from './types';

export const PAGE_SIZE = 20;

const APPLY_FAILURES: Readonly<Record<string, ApplyFailure>> = {
  no_payee_method: 'noPayee',
  closed: 'closed',
  blocked: 'closed',
  not_pending: 'closed',
  taken: 'taken',
  bounty_not_found: 'gone',
  own_bounty: 'own',
};

const NOT_FOUND = 'P0002';

function slug(error: unknown) {
  if (typeof error !== 'object' || error === null) return { message: undefined, code: undefined };
  const { message, code } = error as { message?: unknown; code?: unknown };
  return {
    message: typeof message === 'string' ? message : undefined,
    code: typeof code === 'string' ? code : undefined,
  };
}

const coordinates = (point: Point | null) => ({
  latitude: point?.latitude ?? null,
  longitude: point?.longitude ?? null,
});

export function createSupabaseBoardService(client: SupabaseClient | null): BoardService {
  const db = () => {
    if (!client) throw new Error('Supabase is not configured');
    return client;
  };

  async function fetchPage(origin: BoardOrigin, filter: BoardFilter, after: unknown | null) {
    const { data, error } = await db().rpc('nearby_bounties', {
      ...coordinates(originPoint(origin)),
      board_filter: filter,
      page_after: after,
      page_size: PAGE_SIZE,
    });
    if (error) throw error;
    return toBoardPage(data);
  }

  return {
    async page(origin, filter, after): Promise<BoardPage> {
      try {
        return await fetchPage(origin, filter, after);
      } catch (error) {
        if (after === null || slug(error).message !== 'board_cursor_mismatch') throw error;
        return { ...(await fetchPage(origin, filter, null)), restarted: true };
      }
    },
    async detail(id, point) {
      const { data, error } = await db().rpc('bounty_detail', {
        bounty: id,
        ...coordinates(point),
      });
      if (error) {
        const { message, code } = slug(error);
        if (message === 'bounty_not_found' || code === NOT_FOUND) return 'gone';
        throw error;
      }
      return toBountyDetail(data);
    },
    async hasPayeeMethod() {
      const { count, error } = await db()
        .from('payee_methods')
        .select('id', { count: 'exact', head: true });
      if (error) throw error;
      if (!Number.isInteger(count)) throw new Error('payee_methods returned no count');
      return Number(count) > 0;
    },
    async apply(id, note) {
      try {
        const { data, error } = await db().rpc('apply_to_bounty', { bounty: id, note });
        if (error) {
          const { message } = slug(error);
          return {
            ok: false,
            reason:
              message && Object.hasOwn(APPLY_FAILURES, message)
                ? APPLY_FAILURES[message]
                : 'failed',
          };
        }
        const answer = (data ?? {}) as { status?: unknown; note?: unknown };
        if (answer.status !== 'pending') return { ok: false, reason: 'failed' };
        return { ok: true, note: typeof answer.note === 'string' ? answer.note : null };
      } catch {
        return { ok: false, reason: 'failed' };
      }
    },
    async withdraw(id) {
      try {
        const { data, error } = await db().rpc('withdraw_application', { bounty: id });
        if (error) {
          const { message } = slug(error);
          const gone = message === 'not_pending' || message === 'bounty_not_found';
          return { ok: false, reason: gone ? 'notPending' : 'failed' };
        }
        const answer = (data ?? {}) as { status?: unknown };
        return answer.status === 'withdrawn' ? { ok: true } : { ok: false, reason: 'failed' };
      } catch {
        return { ok: false, reason: 'failed' };
      }
    },
  };
}

import type { SupabaseClient } from '@supabase/supabase-js';

import { slug } from '../board/boardService';
import { toApplicants } from './parse';
import type { SelectFailure, SelectService } from './types';

const SELECT_FAILURES: Readonly<Record<string, SelectFailure>> = {
  taken: 'taken',
  closed: 'closed',
  not_pending: 'notPending',
  blocked: 'notPending',
  no_payee_method: 'noPayee',
  bounty_not_found: 'gone',
  not_poster: 'gone',
};

const GONE = new Set(['bounty_not_found', 'not_poster']);

export function createSupabaseSelectService(client: SupabaseClient | null): SelectService {
  const db = () => {
    if (!client) throw new Error('Supabase is not configured');
    return client;
  };

  return {
    async applicants(bountyId) {
      const { data, error } = await db().rpc('bounty_applicants', { bounty: bountyId });
      if (error) {
        const { message } = slug(error);
        if (message && GONE.has(message)) return 'gone';
        throw error;
      }
      return toApplicants(data);
    },
    async select(bountyId, applicantId) {
      try {
        const { data, error } = await db().rpc('select_helper', {
          bounty: bountyId,
          applicant: applicantId,
        });
        if (error) {
          const { message } = slug(error);
          return {
            ok: false,
            reason:
              message && Object.hasOwn(SELECT_FAILURES, message)
                ? SELECT_FAILURES[message]
                : 'failed',
          };
        }
        const answer = (data ?? {}) as { status?: unknown; helperId?: unknown };
        if (answer.status !== 'assigned' || typeof answer.helperId !== 'string') {
          return { ok: false, reason: 'failed' };
        }
        return { ok: true, helperId: answer.helperId };
      } catch {
        return { ok: false, reason: 'failed' };
      }
    },
    async markNotSelectedSeen(bountyId) {
      try {
        await db().rpc('mark_bounty_seen', { bounty: bountyId, card: 'not_selected' });
      } catch {}
    },
  };
}

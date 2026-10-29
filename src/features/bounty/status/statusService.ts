import type { SupabaseClient } from '@supabase/supabase-js';

import { NOT_FOUND, slug } from '../board/boardService';
import { body, fail, text, textOrNull } from '../board/parse';
import { toCancelOutcome, toCancelPreview, toRefund, toStatusDetail } from './parse';
import type { ActionFailure, ActionResult, StatusService } from './types';

const FAILURES: Readonly<Record<string, ActionFailure>> = {
  invalid_transition: 'changed',
  not_helper: 'unavailable',
  not_poster: 'unavailable',
  bounty_not_found: 'unavailable',
  invalid_bounty: 'invalid',
  invalid_reason: 'invalid',
};

const UNAVAILABLE = new Set(['bounty_not_found', 'not_helper', 'not_poster']);

function answered(value: unknown, status: string) {
  const answer = body(value, 'answer');
  return answer.status === status ? answer : fail('answer.status');
}

export function createSupabaseStatusService(client: SupabaseClient | null): StatusService {
  const db = () => {
    if (!client) throw new Error('Supabase is not configured');
    return client;
  };

  async function call<T>(
    name: string,
    args: Record<string, unknown>,
    read: (data: unknown) => T,
  ): Promise<ActionResult<T>> {
    try {
      const { data, error } = await db().rpc(name, args);
      if (error) {
        const { message } = slug(error);
        return {
          ok: false,
          reason: message && Object.hasOwn(FAILURES, message) ? FAILURES[message] : 'failed',
        };
      }
      return { ok: true, value: read(data) };
    } catch {
      return { ok: false, reason: 'failed' };
    }
  }

  return {
    async detail(bountyId) {
      const { data, error } = await db().rpc('bounty_detail', { bounty: bountyId });
      if (error) {
        const { message, code } = slug(error);
        if ((message && UNAVAILABLE.has(message)) || code === NOT_FOUND) return 'unavailable';
        throw error;
      }
      return toStatusDetail(data);
    },
    start: (bountyId, etaAt) =>
      call('start_bounty', { bounty: bountyId, eta: etaAt }, (data) => ({
        etaAt: textOrNull(answered(data, 'en_route').etaAt, 'etaAt'),
      })),
    updateEta: (bountyId, etaAt) =>
      call('update_eta', { bounty: bountyId, eta: etaAt }, (data) => {
        const answer = answered(data, 'en_route');
        return {
          etaAt: text(answer.etaAt, 'etaAt'),
          previousEtaAt: textOrNull(answer.previousEtaAt, 'previousEtaAt'),
        };
      }),
    complete: (bountyId) =>
      call('complete_bounty', { bounty: bountyId }, (data) => ({
        autoConfirmAt: text(answered(data, 'done').autoConfirmAt, 'autoConfirmAt'),
      })),
    confirm: (bountyId) =>
      call('confirm_bounty', { bounty: bountyId }, (data) => ({
        paymentId: text(answered(data, 'confirmed').paymentId, 'paymentId'),
      })),
    reportProblem: (bountyId, reason) =>
      call('report_bounty_problem', { bounty: bountyId, reason }, (data) => {
        answered(data, 'disputed');
        return null;
      }),
    cancelPreview: (bountyId) =>
      call('bounty_cancel_preview', { bounty: bountyId }, toCancelPreview),
    cancel: (bountyId) => call('cancel_bounty', { bounty: bountyId }, toCancelOutcome),
    close: (bountyId) => call('close_bounty', { bounty: bountyId }, toRefund),
  };
}

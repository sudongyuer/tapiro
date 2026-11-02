import type { SupabaseClient } from '@supabase/supabase-js';

import type { CurrencyCode } from '@/lib/money';

import { toRideDetail } from './parseDetail';
import type {
  CancelPreview,
  NoShowPreview,
  RideDetailService,
  RideFailure,
  RideWrite,
} from './types';

const FAILURES: Readonly<Record<string, RideFailure>> = {
  ride_not_found: 'notFound',
  closed: 'closed',
  departed: 'departed',
  full: 'full',
  not_pending: 'notPending',
  not_member: 'notMember',
  not_organiser: 'notMember',
  own_ride: 'invalid',
  blocked: 'blocked',
  invalid_ride: 'invalid',
  invalid_transition: 'transition',
};

export class RideDetailMissing extends Error {}

export function toRideFailure(error: unknown): RideFailure {
  if (typeof error !== 'object' || error === null) return 'failed';
  const { message } = error as { message?: unknown };
  return typeof message === 'string' && Object.hasOwn(FAILURES, message)
    ? FAILURES[message]
    : 'failed';
}

export function toNoShowPreview(value: unknown): NoShowPreview {
  const body = (value ?? {}) as Record<string, unknown>;
  if (typeof body.noShow !== 'boolean') throw new Error('ride: preview has no noShow');
  return {
    noShow: body.noShow,
    waiverAvailable: typeof body.waiverAvailable === 'boolean' ? body.waiverAvailable : null,
  };
}

export function toCancelPreview(value: unknown): CancelPreview {
  const body = (value ?? {}) as Record<string, unknown>;
  if (typeof body.refund !== 'boolean') throw new Error('ride: preview has no refund');
  return { ...toNoShowPreview(value), refund: body.refund };
}

export function createSupabaseRideDetailService(
  client: SupabaseClient | null,
  referenceCurrency: () => CurrencyCode,
): RideDetailService {
  const db = () => {
    if (!client) throw new Error('Supabase is not configured');
    return client;
  };

  async function write<T>(
    name: string,
    args: Record<string, unknown>,
    parse: (data: unknown) => T,
  ): Promise<RideWrite<T>> {
    try {
      const { data, error } = await db().rpc(name, args);
      if (error) return { ok: false, reason: toRideFailure(error) };
      return { ok: true, value: parse(data) };
    } catch (error) {
      return { ok: false, reason: toRideFailure(error) };
    }
  }

  const done = () => null;

  return {
    async load(id) {
      const { data, error } = await db().rpc('ride_detail', {
        ride: id,
        reference_currency: referenceCurrency(),
      });
      if (error) {
        if (toRideFailure(error) === 'notFound') throw new RideDetailMissing(id);
        throw error;
      }
      return toRideDetail(data);
    },
    request: (id, note) => write('request_ride', { ride: id, note }, done),
    withdraw: (id) => write('withdraw_ride_request', { ride: id }, done),
    decide: (id, member, approve) =>
      write('decide_ride_request', { ride: id, member, approve }, done),
    leavePreview: (id) => write('ride_leave_preview', { ride: id }, toNoShowPreview),
    leave: (id) => write('leave_ride', { ride: id }, done),
    cancelPreview: (id) => write('ride_cancel_preview', { ride: id }, toCancelPreview),
    cancel: (id) => write('cancel_ride', { ride: id }, done),
    arrive: (id) => write('mark_ride_arrived', { ride: id }, done),
    undoArrive: (id) => write('undo_ride_arrived', { ride: id }, done),
    late: (id, minutes) => write('report_ride_late', { ride: id, minutes }, done),
    reviseTime: (id, departs) => write('revise_ride_time', { ride: id, departs }, done),
    updateDetails: (id, input) =>
      write(
        'update_ride_details',
        { ride: id, plate: input.plate, eta: input.eta, meeting_note: input.meetingNote },
        done,
      ),
    setSplitMode: (id, mode) => write('set_ride_split_mode', { ride: id, mode }, done),
    depart: (id, boarded) => write('depart_ride', { ride: id, boarded }, done),
    appeal: (id) => write('appeal_ride_no_show', { ride: id }, done),
    confirmAppeal: (id, member) => write('confirm_ride_appeal', { ride: id, member }, done),
  };
}

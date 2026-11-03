import type { SupabaseClient } from '@supabase/supabase-js';

import type { CurrencyCode } from '@/lib/money';

import { toRideDetail } from './parseDetail';
import type { RidePhase } from '../types';
import type {
  CancelPreview,
  NoShowPreview,
  ReceivedResult,
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
  invalid_split: 'invalid',
  no_payee_method: 'noPayee',
};

const RECEIPT_BUCKET = 'ride-receipts';
const PAYMENT_CODES = new Set(['55000', 'P0002', '42501']);
const PHASES: readonly RidePhase[] = [
  'open',
  'gathering',
  'departed',
  'arrived',
  'settling',
  'closed',
  'cancelled',
  'expired',
];

export class RideDetailMissing extends Error {}

export function toRideFailure(error: unknown): RideFailure {
  if (typeof error !== 'object' || error === null) return 'failed';
  const { message } = error as { message?: unknown };
  return typeof message === 'string' && Object.hasOwn(FAILURES, message)
    ? FAILURES[message]
    : 'failed';
}

export function toPaymentFailure(error: unknown): RideFailure {
  if (typeof error !== 'object' || error === null) return 'failed';
  const { code } = error as { code?: unknown };
  return typeof code === 'string' && PAYMENT_CODES.has(code) ? 'transition' : 'failed';
}

export function toReachedPhase(value: unknown): RidePhase {
  const status = (value ?? {}) as { status?: unknown };
  const phase = PHASES.find((candidate) => candidate === status.status);
  if (!phase) throw new Error('ride: 到了 answered without a status');
  return phase;
}

export function toReceived(value: unknown): ReceivedResult {
  const body = (value ?? {}) as Record<string, unknown>;
  if (body.state !== 'settled') throw new Error('ride: 已收到 answered without settling');
  const count = body.stickerCount;
  return {
    rideSettled: body.rideSettled === true,
    firstSettled: body.firstSettled === true,
    stickerCount: typeof count === 'number' && Number.isInteger(count) && count > 0 ? count : null,
  };
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
  readFile: (uri: string) => Promise<ArrayBuffer> = async () => {
    throw new Error('no file reader');
  },
): RideDetailService {
  const db = () => {
    if (!client) throw new Error('Supabase is not configured');
    return client;
  };

  async function write<T>(
    name: string,
    args: Record<string, unknown>,
    parse: (data: unknown) => T,
    failure: (error: unknown) => RideFailure = toRideFailure,
  ): Promise<RideWrite<T>> {
    try {
      const { data, error } = await db().rpc(name, args);
      if (error) return { ok: false, reason: failure(error) };
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
    reach: (id) => write('reach_ride', { ride: id }, toReachedPhase),
    sendSplit: (id, input) =>
      write(
        'send_ride_split',
        {
          ride: id,
          total_minor: input.totalMinor,
          shares: input.shares,
          receipt: input.receipt,
        },
        done,
      ),
    async uploadReceipt(id, fileUri) {
      const extension = /\.png$/i.test(fileUri) ? 'png' : 'jpg';
      const path = `${id}/${Date.now()}.${extension}`;
      const body = await readFile(fileUri);
      const { error } = await db()
        .storage.from(RECEIPT_BUCKET)
        .upload(path, body, { contentType: extension === 'png' ? 'image/png' : 'image/jpeg' });
      if (error) throw error;
      return path;
    },
    async receiptExists(path) {
      const slash = path.lastIndexOf('/');
      const { data, error } = await db()
        .storage.from(RECEIPT_BUCKET)
        .list(path.slice(0, slash), { search: path.slice(slash + 1) });
      if (error) throw error;
      return (data ?? []).some((object) => object.name === path.slice(slash + 1));
    },
    async receiptUrl(path) {
      const { data, error } = await db().storage.from(RECEIPT_BUCKET).createSignedUrl(path, 300);
      if (error) throw error;
      if (!data?.signedUrl) throw new Error('no signed url');
      return data.signedUrl;
    },
    dispute: (id, note) => write('dispute_ride_share', { ride: id, note }, done),
    changeShare: (id, member, minor) =>
      write('change_ride_share', { ride: id, member, minor }, done),
    confirmReceived: (_id, paymentId) =>
      write('confirm_payment_received', { payment: paymentId }, toReceived, toPaymentFailure),
    notReceived: (_id, paymentId) =>
      write('report_not_received', { payment: paymentId }, done, toPaymentFailure),
    collectSticker: (_id, stickerId) =>
      write('collect_sticker', { sticker: stickerId }, done, toPaymentFailure),
  };
}

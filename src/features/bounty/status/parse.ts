import { body, fail, oneOf, text, textOrNull, toBountyDetail } from '../board/parse';
import {
  BOUNTY_STATUSES,
  EVENT_ACTORS,
  EVENT_KINDS,
  PAYMENT_STATES,
  POST_CHARGES,
  type BountyEvent,
  type CancelOutcome,
  type CancelPreview,
  type PostCharge,
  type StatusDetail,
} from './types';

const absent = (value: unknown) => value === null || value === undefined;

const flag = (value: unknown, what: string): boolean =>
  typeof value === 'boolean' ? value : fail(what);

const oneOfOrNull = <T extends string>(values: readonly T[], value: unknown, what: string) =>
  absent(value) ? null : oneOf(values, value, what);

function toEvent(value: unknown): BountyEvent {
  const event = body(value, 'event');
  return {
    kind: oneOf(EVENT_KINDS, event.kind, 'event.kind'),
    at: text(event.at, 'event.at'),
    actor: oneOfOrNull(EVENT_ACTORS, event.actor, 'event.actor'),
    from: textOrNull(event.from, 'event.from'),
    to: textOrNull(event.to, 'event.to'),
    etaAt: textOrNull(event.etaAt, 'event.etaAt'),
    previousEtaAt: textOrNull(event.previousEtaAt, 'event.previousEtaAt'),
    reason: textOrNull(event.reason, 'event.reason'),
  };
}

function toPayment(value: unknown): StatusDetail['payment'] {
  if (absent(value)) return null;
  const payment = body(value, 'payment');
  return {
    id: text(payment.id, 'payment.id'),
    state: oneOf(PAYMENT_STATES, payment.state, 'payment.state'),
  };
}

export function toStatusDetail(value: unknown): StatusDetail | 'unavailable' {
  const base = toBountyDetail(value);
  if (base.viewerRole !== 'poster' && base.viewerRole !== 'helper') return 'unavailable';
  const detail = body(value, 'detail');
  const events = detail.events;
  if (!Array.isArray(events)) fail('events');
  return {
    ...base,
    viewerRole: base.viewerRole,
    status: oneOf(BOUNTY_STATUSES, detail.status, 'status'),
    etaAt: textOrNull(detail.etaAt, 'etaAt'),
    previousEtaAt: textOrNull(detail.previousEtaAt, 'previousEtaAt'),
    autoConfirmAt: textOrNull(detail.autoConfirmAt, 'autoConfirmAt'),
    startLate: flag(detail.startLate, 'startLate'),
    issueReason: textOrNull(detail.issueReason, 'issueReason'),
    payment: toPayment(detail.payment),
    charge: oneOfOrNull(POST_CHARGES, detail.charge, 'charge'),
    events: (events as unknown[]).map(toEvent),
  };
}

export function toCancelPreview(value: unknown): CancelPreview {
  const preview = body(value, 'preview');
  const offender = oneOf(['self', 'other'] as const, preview.offender, 'offender');
  if (offender === 'other') return { offender };
  if (flag(preview.waiverAvailable, 'waiverAvailable')) {
    return { offender, waiverAvailable: true };
  }
  return {
    offender,
    waiverAvailable: false,
    waiverBackAt: textOrNull(preview.waiverBackAt, 'waiverBackAt'),
  };
}

export function toCancelOutcome(value: unknown): CancelOutcome {
  const outcome = body(value, 'cancel');
  if (outcome.status !== 'cancelled') fail('cancel.status');
  return {
    offender: oneOf(['self', 'other'] as const, outcome.offender, 'offender'),
    noShow: oneOfOrNull(['waived', 'counted'] as const, outcome.noShow, 'noShow'),
  };
}

export function toRefund(value: unknown): { refund: PostCharge | null } {
  const outcome = body(value, 'close');
  if (outcome.status !== 'closed') fail('close.status');
  return { refund: oneOfOrNull(POST_CHARGES, outcome.refund, 'refund') };
}

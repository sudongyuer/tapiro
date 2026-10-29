import type { BountyDetail } from '../board/types';

export const BOUNTY_STATUSES = [
  'open',
  'assigned',
  'en_route',
  'done',
  'disputed',
  'confirmed',
  'settled',
  'closed',
  'cancelled',
] as const;
export type BountyStatus = (typeof BOUNTY_STATUSES)[number];

export const EVENT_KINDS = [
  'published',
  'applied',
  'withdrawn',
  'selected',
  'started',
  'eta_changed',
  'start_reminder',
  'completed',
  'problem_reported',
  'confirmed',
  'auto_confirmed',
  'closed',
  'expired',
  'cancelled',
] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export const EVENT_ACTORS = ['poster', 'helper'] as const;
export type EventActor = (typeof EVENT_ACTORS)[number];

export const PAYMENT_STATES = ['due', 'marked_paid', 'settled', 'disputed'] as const;
export type PaymentState = (typeof PAYMENT_STATES)[number];

export const POST_CHARGES = ['free', 'coin'] as const;
export type PostCharge = (typeof POST_CHARGES)[number];

export type StatusRole = EventActor;

export type BountyEvent = {
  kind: EventKind;
  at: string;
  actor: EventActor | null;
  from: string | null;
  to: string | null;
  etaAt: string | null;
  previousEtaAt: string | null;
  reason: string | null;
};

export type StatusDetail = Omit<BountyDetail, 'status' | 'viewerRole'> & {
  status: BountyStatus;
  viewerRole: StatusRole;
  etaAt: string | null;
  previousEtaAt: string | null;
  autoConfirmAt: string | null;
  startLate: boolean;
  issueReason: string | null;
  payment: { id: string; state: PaymentState } | null;
  charge: PostCharge | null;
  events: BountyEvent[];
};

export type CancelPreview =
  | { offender: 'other' }
  | { offender: 'self'; waiverAvailable: true }
  | { offender: 'self'; waiverAvailable: false; waiverBackAt: string | null };

export type CancelOutcome = {
  offender: 'self' | 'other';
  noShow: 'waived' | 'counted' | null;
};

export type ActionFailure = 'changed' | 'unavailable' | 'invalid' | 'failed';

export type ActionResult<T> = { ok: true; value: T } | { ok: false; reason: ActionFailure };

export type StatusService = {
  detail(bountyId: string): Promise<StatusDetail | 'unavailable'>;
  start(bountyId: string, etaAt: string): Promise<ActionResult<{ etaAt: string | null }>>;
  updateEta(
    bountyId: string,
    etaAt: string,
  ): Promise<ActionResult<{ etaAt: string; previousEtaAt: string | null }>>;
  complete(bountyId: string): Promise<ActionResult<{ autoConfirmAt: string }>>;
  confirm(bountyId: string): Promise<ActionResult<{ paymentId: string }>>;
  reportProblem(bountyId: string, reason: string): Promise<ActionResult<null>>;
  cancelPreview(bountyId: string): Promise<ActionResult<CancelPreview>>;
  cancel(bountyId: string): Promise<ActionResult<CancelOutcome>>;
  close(bountyId: string): Promise<ActionResult<{ refund: PostCharge | null }>>;
};

export const ISSUE_REASON_MAX = 140;

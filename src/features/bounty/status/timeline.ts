import type { BountyEvent, EventKind, StatusDetail, StatusRole } from './types';

export const STEP_IDS = ['selected', 'started', 'completed', 'confirmed', 'payment'] as const;
export type StepId = (typeof STEP_IDS)[number];

export type StepState = 'done' | 'current' | 'needsYou' | 'upcoming';

export type StepKey =
  | `bounty.status.step.poster.${'selected' | 'started' | 'completed' | 'confirm' | 'confirmed' | 'paid'}`
  | `bounty.status.step.helper.${'selected' | 'start' | 'started' | 'complete' | 'completed' | 'confirmed' | 'paid'}`;

export type LineKind =
  'departBy' | 'late' | 'eta' | 'etaPrevious' | 'autoConfirm' | 'reason' | 'dispute' | 'pay';

export type LineKey =
  | `bounty.status.note.${
      | 'departBy'
      | 'departByPoster'
      | 'late'
      | 'eta'
      | 'autoConfirmPoster'
      | 'autoConfirmHelper'
      | 'reason'
      | 'yourReason'
      | 'disputeHelper'
      | 'disputePoster'
      | 'payPoster'
      | 'payHelper'}`
  | 'bounty.eta.previous';

export type CopyParams = {
  name?: string | null;
  sen?: number;
  at?: string;
  reason?: string;
};

export type TimelineLine = {
  kind: LineKind;
  key: LineKey;
  params: CopyParams;
  struck: boolean;
  tone: 'plain' | 'warning';
};

export type TimelineStep = {
  id: StepId;
  state: StepState;
  at: string | null;
  key: StepKey;
  params: CopyParams;
  lines: TimelineLine[];
};

export type TimelineEnd = {
  kind: 'cancelled' | 'closed';
  at: string | null;
  by: 'you' | 'them' | null;
};

export type Timeline = { steps: TimelineStep[]; ended: TimelineEnd | null };

export const counterpartName = (detail: StatusDetail, role: StatusRole) =>
  role === 'poster' ? (detail.helper?.name ?? null) : detail.poster.name;

const lastEvent = (events: BountyEvent[], kinds: readonly EventKind[]) =>
  events.findLast((event) => kinds.includes(event.kind)) ?? null;

const STEP_EVENTS: Record<StepId, readonly EventKind[]> = {
  selected: ['selected'],
  started: ['started'],
  completed: ['completed'],
  confirmed: ['confirmed', 'auto_confirmed'],
  payment: [],
};

const CURRENT: Partial<Record<StatusDetail['status'], number>> = {
  open: 0,
  assigned: 1,
  en_route: 2,
  disputed: 2,
  done: 3,
  confirmed: 4,
  settled: STEP_IDS.length,
};

function reached(detail: StatusDetail) {
  const known = CURRENT[detail.status];
  if (known !== undefined) return { index: known, live: detail.status !== 'settled' };
  const has = (kind: EventKind) => detail.events.some((event) => event.kind === kind);
  const index = has('started') ? 2 : has('selected') ? 1 : 0;
  return { index, live: false };
}

function waitsOn(detail: StatusDetail, step: StepId): StatusRole | null {
  switch (step) {
    case 'selected':
    case 'confirmed':
      return 'poster';
    case 'started':
    case 'completed':
      return 'helper';
    case 'payment':
      if (detail.payment?.state === 'due') return 'poster';
      if (detail.payment?.state === 'marked_paid') return 'helper';
      return null;
  }
}

function stepKey(id: StepId, role: StatusRole, state: StepState): StepKey {
  const done = state === 'done';
  if (role === 'poster') {
    if (id === 'payment') return 'bounty.status.step.poster.paid';
    if (id === 'confirmed') return `bounty.status.step.poster.${done ? 'confirmed' : 'confirm'}`;
    return `bounty.status.step.poster.${id}`;
  }
  if (id === 'payment') return 'bounty.status.step.helper.paid';
  if (id === 'started') return `bounty.status.step.helper.${done ? 'started' : 'start'}`;
  if (id === 'completed') return `bounty.status.step.helper.${done ? 'completed' : 'complete'}`;
  return `bounty.status.step.helper.${id}`;
}

const line = (
  kind: LineKind,
  key: LineKey,
  params: CopyParams,
  options: { struck?: boolean; tone?: TimelineLine['tone'] } = {},
): TimelineLine => ({
  kind,
  key,
  params,
  struck: options.struck ?? false,
  tone: options.tone ?? 'plain',
});

function startLines(detail: StatusDetail, role: StatusRole): TimelineLine[] {
  if (detail.status === 'assigned') {
    if (!detail.startsAt) return [];
    if (detail.startLate) {
      return [
        line('late', 'bounty.status.note.late', { at: detail.startsAt }, { tone: 'warning' }),
      ];
    }
    const key =
      role === 'poster' ? 'bounty.status.note.departByPoster' : 'bounty.status.note.departBy';
    return [line('departBy', key, { at: detail.startsAt })];
  }
  if (detail.status !== 'en_route') return [];
  return [
    ...(detail.etaAt ? [line('eta', 'bounty.status.note.eta', { at: detail.etaAt })] : []),
    ...(detail.previousEtaAt
      ? [line('etaPrevious', 'bounty.eta.previous', { at: detail.previousEtaAt }, { struck: true })]
      : []),
  ];
}

function disputeLines(detail: StatusDetail, role: StatusRole): TimelineLine[] {
  const reported = lastEvent(detail.events, ['problem_reported']);
  const reason = detail.issueReason ?? reported?.reason ?? '';
  const name = counterpartName(detail, role);
  const poster = role === 'poster';
  return [
    line(
      'reason',
      poster ? 'bounty.status.note.yourReason' : 'bounty.status.note.reason',
      { reason, ...(reported ? { at: reported.at } : {}) },
      { tone: 'warning' },
    ),
    line(
      'dispute',
      poster ? 'bounty.status.note.disputePoster' : 'bounty.status.note.disputeHelper',
      poster ? { name } : {},
    ),
  ];
}

function linesFor(detail: StatusDetail, role: StatusRole, step: StepId): TimelineLine[] {
  const name = counterpartName(detail, role);
  const poster = role === 'poster';
  switch (step) {
    case 'started':
      return startLines(detail, role);
    case 'completed':
      return detail.status === 'disputed' ? disputeLines(detail, role) : [];
    case 'confirmed':
      if (detail.status !== 'done' || !detail.autoConfirmAt) return [];
      return poster
        ? [
            line('autoConfirm', 'bounty.status.note.autoConfirmPoster', {
              at: detail.autoConfirmAt,
            }),
          ]
        : [
            line('autoConfirm', 'bounty.status.note.autoConfirmHelper', {
              at: detail.autoConfirmAt,
              name,
            }),
          ];
    case 'payment':
      if (detail.status !== 'confirmed') return [];
      return [
        line('pay', poster ? 'bounty.status.note.payPoster' : 'bounty.status.note.payHelper', {
          name,
        }),
      ];
    case 'selected':
      return [];
  }
}

function ending(detail: StatusDetail, role: StatusRole): TimelineEnd | null {
  if (detail.status !== 'cancelled' && detail.status !== 'closed') return null;
  const event = lastEvent(detail.events, [detail.status === 'cancelled' ? 'cancelled' : 'closed']);
  const by = event?.actor ? (event.actor === role ? 'you' : 'them') : null;
  return { kind: detail.status, at: event?.at ?? null, by };
}

export function timeline(detail: StatusDetail, role: StatusRole): Timeline {
  const { index, live } = reached(detail);
  const name = counterpartName(detail, role);
  const steps = STEP_IDS.map((id, position): TimelineStep => {
    const state: StepState =
      position < index
        ? 'done'
        : position === index && live
          ? waitsOn(detail, id) === role
            ? 'needsYou'
            : 'current'
          : 'upcoming';
    const event = state === 'done' ? lastEvent(detail.events, STEP_EVENTS[id]) : null;
    return {
      id,
      state,
      at: event?.at ?? null,
      key: stepKey(id, role, state),
      params: { name, sen: detail.rewardSen },
      lines: linesFor(detail, role, id),
    };
  });
  return { steps, ended: ending(detail, role) };
}

export type SummaryKey = `bounty.status.summary.${StatusRole}.${
  'assigned' | 'late' | 'enRoute' | 'done' | 'disputed' | 'confirmed' | 'settled' | 'cancelled'}`;

export function statusSummary(
  detail: StatusDetail,
  role: StatusRole,
): { key: SummaryKey; params: CopyParams } | null {
  const params = { name: counterpartName(detail, role) };
  switch (detail.status) {
    case 'assigned':
      return {
        key: `bounty.status.summary.${role}.${detail.startLate ? 'late' : 'assigned'}`,
        params,
      };
    case 'en_route':
      return { key: `bounty.status.summary.${role}.enRoute`, params };
    case 'done':
    case 'disputed':
    case 'confirmed':
    case 'settled':
    case 'cancelled':
      return { key: `bounty.status.summary.${role}.${detail.status}`, params };
    default:
      return null;
  }
}

export const STATUS_ACTIONS = [
  'start',
  'changeEta',
  'complete',
  'completeAgain',
  'confirm',
  'reportIssue',
  'pay',
  'cancel',
] as const;
export type StatusAction = (typeof STATUS_ACTIONS)[number];

export type StatusActions = { pinned: StatusAction[]; menu: StatusAction[] };

export type ActionKey = `bounty.status.action.${
  | 'start'
  | 'changeEta'
  | 'complete'
  | 'completeAgain'
  | 'confirm'
  | 'problem'
  | 'pay'
  | 'cancel'
  | 'withdraw'}`;

export function actionKey(action: StatusAction, role: StatusRole): ActionKey {
  if (action === 'reportIssue') return 'bounty.status.action.problem';
  if (action === 'cancel' && role === 'helper') return 'bounty.status.action.withdraw';
  return `bounty.status.action.${action}`;
}

const none = (): StatusActions => ({ pinned: [], menu: [] });

export function statusActions(detail: StatusDetail, role: StatusRole): StatusActions {
  const helper = role === 'helper';
  switch (detail.status) {
    case 'assigned':
      return { pinned: helper ? ['start'] : [], menu: ['cancel'] };
    case 'en_route':
      return { pinned: helper ? ['complete', 'changeEta'] : [], menu: ['cancel'] };
    case 'done':
      return helper ? none() : { pinned: ['confirm', 'reportIssue'], menu: [] };
    case 'disputed':
      return { pinned: helper ? ['completeAgain'] : ['confirm'], menu: [] };
    case 'confirmed': {
      const state = detail.payment?.state;
      const pays = helper
        ? state === 'marked_paid' || state === 'disputed'
        : state !== undefined && state !== 'settled';
      return pays ? { pinned: ['pay'], menu: [] } : none();
    }
    default:
      return none();
  }
}

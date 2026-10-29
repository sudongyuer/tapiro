import type { Person } from '../board/types';
import {
  ISSUE_REASON_MAX,
  type ActionFailure,
  type ActionResult,
  type BountyEvent,
  type BountyStatus,
  type CancelOutcome,
  type CancelPreview,
  type EventKind,
  type PaymentState,
  type PostCharge,
  type StatusDetail,
  type StatusRole,
  type StatusService,
} from './types';

export const STATUS_SCENARIOS = [
  'open',
  'assigned',
  'assignedLate',
  'enRoute',
  'enRouteChanged',
  'done',
  'disputed',
  'confirmed',
  'markedPaid',
  'settled',
  'cancelled',
] as const;
export const STATUS_ROLES = ['poster', 'helper'] as const;
export const STATUS_LOADS = ['ok', 'firstFails', 'refreshFails', 'unavailable'] as const;
export const STATUS_WAIVERS = ['available', 'used'] as const;

export type StatusScenario = (typeof STATUS_SCENARIOS)[number];
export type StatusLoad = (typeof STATUS_LOADS)[number];
export type StatusWaiver = (typeof STATUS_WAIVERS)[number];

export type StatusCall = { name: string; bountyId: string; args?: Record<string, unknown> };

export type FixtureStatusOptions = {
  scenario: StatusScenario;
  role: StatusRole;
  load: StatusLoad;
  waiver: StatusWaiver;
  now: () => Date;
  writeDelayMs?: number;
  onCalled?: (calls: StatusCall[]) => void;
};

export type NextFailure = ActionFailure;

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const pick = <T extends string>(values: readonly T[], value: string | undefined, fallback: T): T =>
  values.find((candidate) => candidate === value) ?? fallback;

export function fixtureStatusOptions(
  argument: (name: string) => string | undefined,
  now: () => Date = () => new Date(),
): FixtureStatusOptions {
  return {
    scenario: pick(STATUS_SCENARIOS, argument('uiVerifyBountyStatus'), 'assigned'),
    role: pick(STATUS_ROLES, argument('uiVerifyBountyRole'), 'poster'),
    load: pick(STATUS_LOADS, argument('uiVerifyBountyStatusLoad'), 'ok'),
    waiver: pick(STATUS_WAIVERS, argument('uiVerifyBountyWaiver'), 'available'),
    now,
  };
}

export const FIXTURE_POSTER: Person = { id: 'fixture-poster-lin', name: '小林', tier: 'reliable' };
export const FIXTURE_HELPER: Person = {
  id: 'fixture-applicant-jie',
  name: '阿杰',
  tier: 'very_reliable',
};
export const FIXTURE_REASON = '快递盒子压坏了，里面的杯子碎了一个';
export const FIXTURE_PAYMENT_ID = 'fixture-payment-bounty';

type Bounty = {
  id: string;
  status: BountyStatus;
  startsAt: string | null;
  startLate: boolean;
  etaAt: string | null;
  previousEtaAt: string | null;
  autoConfirmAt: string | null;
  payment: StatusDetail['payment'];
  charge: PostCharge | null;
  cancelled: CancelOutcome | null;
  events: BountyEvent[];
};

const event = (
  kind: EventKind,
  at: number,
  actor: StatusRole | null,
  from: string | null,
  to: string | null,
  extra: Partial<Pick<BountyEvent, 'etaAt' | 'previousEtaAt' | 'reason'>> = {},
): BountyEvent => ({
  kind,
  at: new Date(at).toISOString(),
  actor,
  from,
  to,
  etaAt: extra.etaAt ?? null,
  previousEtaAt: extra.previousEtaAt ?? null,
  reason: extra.reason ?? null,
});

const iso = (ms: number) => new Date(ms).toISOString();

function seedBounty(id: string, scenario: StatusScenario, now: number): Bounty {
  const published = event('published', now - 2 * HOUR_MS, 'poster', null, 'open');
  const selected = event('selected', now - HOUR_MS, 'poster', 'open', 'assigned');
  const base: Bounty = {
    id,
    status: 'assigned',
    startsAt: iso(now + 30 * MINUTE_MS),
    startLate: false,
    etaAt: null,
    previousEtaAt: null,
    autoConfirmAt: null,
    payment: null,
    charge: null,
    cancelled: null,
    events: [published, selected],
  };
  const startedAt = now - 40 * MINUTE_MS;
  const firstEta = now + 10 * MINUTE_MS;
  const started = event('started', startedAt, 'helper', 'assigned', 'en_route', {
    etaAt: iso(firstEta),
  });
  const completed = (at: number, from: BountyStatus = 'en_route') =>
    event('completed', at, 'helper', from, 'done');
  const paid = (state: PaymentState, status: BountyStatus): Bounty => ({
    ...base,
    status,
    payment: { id: FIXTURE_PAYMENT_ID, state },
    events: [
      ...base.events,
      started,
      completed(now - 30 * MINUTE_MS),
      event('confirmed', now - 10 * MINUTE_MS, 'poster', 'done', 'confirmed'),
    ],
  });
  switch (scenario) {
    case 'open':
      return { ...base, status: 'open', charge: 'free', events: [published] };
    case 'assigned':
      return base;
    case 'assignedLate':
      return {
        ...base,
        startsAt: iso(now - 40 * MINUTE_MS),
        startLate: true,
        events: [
          ...base.events,
          event('start_reminder', now - 40 * MINUTE_MS, null, 'assigned', 'assigned'),
        ],
      };
    case 'enRoute':
      return {
        ...base,
        status: 'en_route',
        etaAt: iso(firstEta),
        events: [...base.events, started],
      };
    case 'enRouteChanged': {
      const later = now + 25 * MINUTE_MS;
      return {
        ...base,
        status: 'en_route',
        etaAt: iso(later),
        previousEtaAt: iso(firstEta),
        events: [
          ...base.events,
          started,
          event('eta_changed', now - 5 * MINUTE_MS, 'helper', 'en_route', 'en_route', {
            etaAt: iso(later),
            previousEtaAt: iso(firstEta),
          }),
        ],
      };
    }
    case 'done': {
      const doneAt = now - 10 * MINUTE_MS;
      return {
        ...base,
        status: 'done',
        autoConfirmAt: iso(doneAt + 48 * HOUR_MS),
        events: [...base.events, started, completed(doneAt)],
      };
    }
    case 'disputed':
      return {
        ...base,
        status: 'disputed',
        events: [
          ...base.events,
          started,
          completed(now - 30 * MINUTE_MS),
          event('problem_reported', now - 10 * MINUTE_MS, 'poster', 'done', 'disputed', {
            reason: FIXTURE_REASON,
          }),
        ],
      };
    case 'confirmed':
      return paid('due', 'confirmed');
    case 'markedPaid':
      return paid('marked_paid', 'confirmed');
    case 'settled':
      return paid('settled', 'settled');
    case 'cancelled':
      return {
        ...base,
        status: 'cancelled',
        events: [
          ...base.events,
          event('cancelled', now - 5 * MINUTE_MS, 'poster', 'assigned', 'cancelled'),
        ],
      };
  }
}

function issueReason(bounty: Bounty) {
  if (bounty.status !== 'disputed') return null;
  return bounty.events.findLast((item) => item.kind === 'problem_reported')?.reason ?? null;
}

const pause = (ms: number) =>
  ms > 0 ? new Promise<void>((resolve) => setTimeout(resolve, ms)) : Promise.resolve();

export function createFixtureStatusService(options: FixtureStatusOptions) {
  const base = options.now().getTime();
  const { role } = options;
  const bounties = new Map<string, Bounty>();
  const calls: StatusCall[] = [];
  let loads = 0;
  let nextFailure: NextFailure | null = null;

  function bounty(id: string): Bounty {
    const known = bounties.get(id);
    if (known) return known;
    const fresh = seedBounty(id, options.scenario, base);
    bounties.set(id, fresh);
    return fresh;
  }

  function record(name: string, bountyId: string, args?: Record<string, unknown>) {
    calls.push(args ? { name, bountyId, args } : { name, bountyId });
    options.onCalled?.([...calls]);
  }

  function consumeFailure() {
    const failure = nextFailure;
    nextFailure = null;
    return failure;
  }

  function toDetail(item: Bounty): StatusDetail {
    return {
      id: item.id,
      title: '帮取快递',
      description: '取件码 6-2231，放门口就好',
      category: 'pickup',
      rewardSen: 800,
      status: item.status,
      viewerRole: role,
      place: { label: 'Sunway Geo 宿舍', latitude: 3.0645, longitude: 101.6094 },
      distanceM: null,
      address: 'Sunway Geo Residences, Block B, 23-07',
      startsAt: item.startsAt,
      endsAt: null,
      deadlineAt: null,
      expiresAt: iso(base + 7 * DAY_MS),
      poster: FIXTURE_POSTER,
      helper: item.status === 'open' ? null : FIXTURE_HELPER,
      myApplication: null,
      etaAt: item.etaAt,
      previousEtaAt: item.previousEtaAt,
      autoConfirmAt: item.status === 'done' ? item.autoConfirmAt : null,
      startLate: item.status === 'assigned' && item.startLate,
      issueReason: issueReason(item),
      payment: item.payment,
      charge: role === 'poster' && item.status === 'open' ? item.charge : null,
      events: item.events.map((entry) => ({ ...entry })),
    };
  }

  async function act<T>(
    name: string,
    bountyId: string,
    args: Record<string, unknown> | undefined,
    run: (item: Bounty, now: number) => ActionResult<T>,
  ): Promise<ActionResult<T>> {
    record(name, bountyId, args);
    await pause(options.writeDelayMs ?? 0);
    const failure = consumeFailure();
    if (failure) return { ok: false, reason: failure };
    return run(bounty(bountyId), options.now().getTime());
  }

  const ok = <T>(value: T): ActionResult<T> => ({ ok: true, value });
  const no = (reason: ActionFailure): { ok: false; reason: ActionFailure } => ({
    ok: false,
    reason,
  });

  function move(item: Bounty, to: BountyStatus, entry: BountyEvent) {
    item.status = to;
    item.events.push(entry);
  }

  const service: StatusService = {
    async detail(bountyId) {
      record('bounty_detail', bountyId);
      loads += 1;
      const failure = consumeFailure();
      if (failure === 'unavailable' || options.load === 'unavailable') return 'unavailable';
      if (
        failure ||
        (options.load === 'firstFails' && loads === 1) ||
        (options.load === 'refreshFails' && loads === 2)
      ) {
        throw new TypeError('Network request failed');
      }
      const item = bounty(bountyId);
      if (role === 'helper' && item.status === 'open') return 'unavailable';
      return toDetail(item);
    },
    start: (bountyId, etaAt) =>
      act('start_bounty', bountyId, { eta: etaAt }, (item, now) => {
        if (role !== 'helper') return no('unavailable');
        if (item.status === 'en_route') return ok({ etaAt: item.etaAt });
        if (item.status !== 'assigned') return no('changed');
        if (new Date(etaAt).getTime() <= now) return no('invalid');
        item.etaAt = etaAt;
        item.startLate = false;
        move(item, 'en_route', event('started', now, 'helper', 'assigned', 'en_route', { etaAt }));
        return ok({ etaAt });
      }),
    updateEta: (bountyId, etaAt) =>
      act('update_eta', bountyId, { eta: etaAt }, (item, now) => {
        if (role !== 'helper') return no('unavailable');
        if (item.status !== 'en_route') return no('changed');
        if (new Date(etaAt).getTime() <= now || etaAt === item.etaAt) return no('invalid');
        const previousEtaAt = item.etaAt;
        item.previousEtaAt = previousEtaAt;
        item.etaAt = etaAt;
        item.events.push(
          event('eta_changed', now, 'helper', 'en_route', 'en_route', { etaAt, previousEtaAt }),
        );
        return ok({ etaAt, previousEtaAt });
      }),
    complete: (bountyId) =>
      act('complete_bounty', bountyId, undefined, (item, now) => {
        if (role !== 'helper') return no('unavailable');
        if (item.status === 'done' && item.autoConfirmAt) {
          return ok({ autoConfirmAt: item.autoConfirmAt });
        }
        if (item.status !== 'en_route' && item.status !== 'disputed') return no('changed');
        const autoConfirmAt = iso(now + 48 * HOUR_MS);
        item.autoConfirmAt = autoConfirmAt;
        move(item, 'done', event('completed', now, 'helper', item.status, 'done'));
        return ok({ autoConfirmAt });
      }),
    confirm: (bountyId) =>
      act('confirm_bounty', bountyId, undefined, (item, now) => {
        if (role !== 'poster') return no('unavailable');
        if ((item.status === 'confirmed' || item.status === 'settled') && item.payment) {
          return ok({ paymentId: item.payment.id });
        }
        if (item.status !== 'done' && item.status !== 'disputed') return no('changed');
        item.payment = { id: FIXTURE_PAYMENT_ID, state: 'due' };
        move(item, 'confirmed', event('confirmed', now, 'poster', item.status, 'confirmed'));
        return ok({ paymentId: FIXTURE_PAYMENT_ID });
      }),
    reportProblem: (bountyId, reason) =>
      act('report_bounty_problem', bountyId, { reason }, (item, now) => {
        if (role !== 'poster') return no('unavailable');
        if (item.status === 'disputed') return ok(null);
        if (item.status !== 'done') return no('changed');
        const cleaned = reason.trim();
        if (cleaned.length === 0 || [...cleaned].length > ISSUE_REASON_MAX) return no('invalid');
        move(
          item,
          'disputed',
          event('problem_reported', now, 'poster', 'done', 'disputed', { reason: cleaned }),
        );
        return ok(null);
      }),
    cancelPreview: (bountyId) =>
      act('bounty_cancel_preview', bountyId, undefined, (item, now) => {
        if (item.status !== 'assigned' && item.status !== 'en_route') return no('changed');
        if (role === 'poster' && item.status === 'assigned' && item.startLate) {
          return ok<CancelPreview>({ offender: 'other' });
        }
        if (options.waiver === 'available') {
          return ok<CancelPreview>({ offender: 'self', waiverAvailable: true });
        }
        return ok<CancelPreview>({
          offender: 'self',
          waiverAvailable: false,
          waiverBackAt: iso(now + 20 * DAY_MS),
        });
      }),
    cancel: (bountyId) =>
      act('cancel_bounty', bountyId, undefined, (item, now) => {
        if (item.cancelled) return ok(item.cancelled);
        if (item.status !== 'assigned' && item.status !== 'en_route') return no('changed');
        const other = role === 'poster' && item.status === 'assigned' && item.startLate;
        const outcome: CancelOutcome = other
          ? { offender: 'other', noShow: null }
          : { offender: 'self', noShow: options.waiver === 'available' ? 'waived' : 'counted' };
        item.cancelled = outcome;
        move(item, 'cancelled', event('cancelled', now, role, item.status, 'cancelled'));
        return ok(outcome);
      }),
    close: (bountyId) =>
      act('close_bounty', bountyId, undefined, (item, now) => {
        if (role !== 'poster') return no('unavailable');
        const closedByMe = item.events.some((entry) => entry.kind === 'closed');
        if (item.status === 'closed' && closedByMe) return ok({ refund: item.charge });
        if (item.status !== 'open') return no('changed');
        move(item, 'closed', event('closed', now, 'poster', 'open', 'closed'));
        return ok({ refund: item.charge });
      }),
  };

  return {
    service,
    calls: () => [...calls],
    failNext(reason: NextFailure = 'failed') {
      nextFailure = reason;
    },
  };
}

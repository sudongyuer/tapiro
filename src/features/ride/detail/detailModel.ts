import { departsAt, expiresAt, gathersAt, NO_SHOW_WINDOW_MS } from '../rideTimes';
import { settleFooter, type SettleFooter } from './settleModel';
import type { RideDetail, RideMember } from './types';

const MINUTE = 60_000;

export type DetailPhase =
  'before' | 'meetup' | 'departed' | 'arrived' | 'settling' | 'closed' | 'cancelled' | 'expired';

export function detailPhase(ride: RideDetail, now: number): DetailPhase {
  if (ride.status === 'open' || ride.status === 'gathering') {
    if (now >= expiresAt(ride)) return 'expired';
    return now >= gathersAt(ride) ? 'meetup' : 'before';
  }
  return ride.status;
}

export const STEP_KEYS = ['published', 'full', 'meetup', 'board', 'arrive', 'settle'] as const;
export type StepKey = (typeof STEP_KEYS)[number];
export type StepState = 'past' | 'now' | 'future';
export type TimelineStep = { key: StepKey; state: StepState; at: number | null; estimate: boolean };

const CURRENT: Partial<Record<DetailPhase, number>> = {
  before: 1,
  meetup: 2,
  departed: 4,
  arrived: 4,
  settling: 5,
  closed: STEP_KEYS.length,
};

const at = (iso: string | null) => (iso === null ? null : Date.parse(iso));

export function timeline(ride: RideDetail, now: number): TimelineStep[] {
  const phase = detailPhase(ride, now);
  const current = CURRENT[phase] ?? -1;
  const eta = at(ride.details?.eta ?? null);
  const times: Record<StepKey, { at: number | null; estimate: boolean }> = {
    published: { at: at(ride.createdAt), estimate: false },
    full: { at: at(ride.fullAt), estimate: false },
    meetup: { at: gathersAt(ride), estimate: false },
    board: { at: at(ride.departedAt) ?? departsAt(ride), estimate: false },
    arrive: ride.reachedAt
      ? { at: at(ride.reachedAt), estimate: false }
      : { at: eta, estimate: eta !== null },
    settle: { at: at(ride.settledAt), estimate: false },
  };
  return STEP_KEYS.map((key, index) => ({
    key,
    ...times[key],
    state:
      current < 0
        ? index === 0
          ? 'past'
          : 'future'
        : index < current
          ? 'past'
          : index === current
            ? 'now'
            : 'future',
  }));
}

export function countdown(ride: RideDetail, now: number) {
  const left = departsAt(ride) - now;
  return left > 0
    ? { late: false, minutes: Math.max(1, Math.ceil(left / MINUTE)) }
    : { late: true, minutes: Math.max(0, Math.floor(-left / MINUTE)) };
}

export type Arrival =
  | { kind: 'arrived'; at: number }
  | { kind: 'late'; minutes: number; until: number; said: number | null; passed: boolean }
  | { kind: 'waiting' };

export function arrival(member: RideMember, now: number): Arrival {
  if (member.arrivedAt) return { kind: 'arrived', at: Date.parse(member.arrivedAt) };
  if (member.lateUntil) {
    const until = Date.parse(member.lateUntil);
    const said = member.lateAt ? Date.parse(member.lateAt) : null;
    const minutes = said === null ? 0 : Math.round((until - said) / MINUTE);
    return { kind: 'late', minutes, until, said, passed: now >= until };
  }
  return { kind: 'waiting' };
}

export const activeMembers = (ride: RideDetail) =>
  (ride.members ?? []).filter(
    (member) => member.status === 'accepted' || member.status === 'boarded',
  );

export const arrivedCount = (ride: RideDetail) =>
  activeMembers(ride).filter((member) => member.arrivedAt !== null).length;

export function emptySeats(ride: RideDetail) {
  return Math.max(0, ride.seats - ride.taken);
}

export function latestJoined(ride: RideDetail, viewerId: string | null) {
  return (
    activeMembers(ride)
      .filter((member) => !member.organiser && member.id !== viewerId && member.joinedAt)
      .sort((a, b) => Date.parse(b.joinedAt ?? '') - Date.parse(a.joinedAt ?? ''))[0] ?? null
  );
}

export function departPreticked(ride: RideDetail) {
  return activeMembers(ride)
    .filter((member) => !member.organiser && member.arrivedAt !== null)
    .map((member) => member.id);
}

export const departCandidates = (ride: RideDetail) =>
  activeMembers(ride).filter((member) => !member.organiser && member.status === 'accepted');

export function askGoOrCancel(ride: RideDetail, now: number) {
  const departs = departsAt(ride);
  return (
    ride.role === 'organiser' &&
    detailPhase(ride, now) === 'meetup' &&
    ride.taken < ride.seats &&
    now >= departs - NO_SHOW_WINDOW_MS &&
    now < departs
  );
}

export type Footer =
  | { kind: 'none' }
  | { kind: 'apply'; blocked: 'full' | null }
  | { kind: 'applied' }
  | { kind: 'arrive' }
  | { kind: 'arrived'; at: number }
  | { kind: 'depart'; arrived: number; selfArrived: boolean }
  | { kind: 'settle'; settle: SettleFooter };

export function footer(ride: RideDetail, now: number, viewerId = ''): Footer {
  const phase = detailPhase(ride, now);
  const open = phase === 'before' || phase === 'meetup';
  if (!open) {
    const settle = settleFooter(ride, viewerId);
    return settle ? { kind: 'settle', settle } : { kind: 'none' };
  }
  switch (ride.role) {
    case 'viewer':
      return { kind: 'apply', blocked: ride.taken >= ride.seats ? 'full' : null };
    case 'applicant':
      return { kind: 'applied' };
    case 'member':
      if (phase !== 'meetup') return { kind: 'none' };
      return ride.arrivedAt
        ? { kind: 'arrived', at: Date.parse(ride.arrivedAt) }
        : { kind: 'arrive' };
    case 'organiser':
      return phase === 'meetup'
        ? {
            kind: 'depart',
            arrived: activeMembers(ride).filter((m) => !m.organiser && m.arrivedAt !== null).length,
            selfArrived: ride.arrivedAt !== null,
          }
        : { kind: 'none' };
    default:
      return { kind: 'none' };
  }
}

export type AppealView =
  | { kind: 'none' }
  | { kind: 'canAppeal'; until: number }
  | { kind: 'pending'; until: number }
  | { kind: 'lapsed'; outcome: 'waived' | 'counted' | null }
  | { kind: 'closed'; outcome: 'waived' | 'counted' | null };

export function appealView(ride: RideDetail, now: number): AppealView {
  if (ride.role !== 'noShow') return { kind: 'none' };
  const until = ride.appealEndsAt ? Date.parse(ride.appealEndsAt) : 0;
  if (ride.myStatus === 'appealed') return { kind: 'pending', until };
  if (ride.appealLapsed) return { kind: 'lapsed', outcome: ride.noShow };
  return now < until ? { kind: 'canAppeal', until } : { kind: 'closed', outcome: ride.noShow };
}

export function appealsToConfirm(ride: RideDetail, viewerId: string | null, now: number) {
  const boarded = (ride.members ?? []).some(
    (member) => member.id === viewerId && member.status === 'boarded',
  );
  const open = ride.appealEndsAt !== null && now < Date.parse(ride.appealEndsAt);
  if (!boarded || !open) return [];
  return (ride.members ?? []).filter((member) => member.status === 'appealed');
}

export const hasThread = (ride: RideDetail) =>
  ride.role === 'member' ||
  ride.role === 'noShow' ||
  (ride.role === 'organiser' && (ride.members ?? []).some((member) => !member.organiser));

export type MenuItem = 'block' | 'leave' | 'cancel' | 'reviseTime' | 'editDetails';

export function menuItems(ride: RideDetail, now: number): MenuItem[] {
  const phase = detailPhase(ride, now);
  const open = phase === 'before' || phase === 'meetup';
  const items: MenuItem[] = [];
  if (ride.role === 'organiser') {
    if (open) items.push('reviseTime');
    if (open || phase === 'departed') items.push('editDetails');
    if (open) items.push('cancel');
    return items;
  }
  if (ride.role === 'member' && open && ride.myStatus === 'accepted') items.push('leave');
  if (ride.organiser) items.push('block');
  return items;
}

export const POLL_MS = 15_000;
const POLL_WINDOW_MS = 15 * MINUTE;

export function shouldPoll(ride: RideDetail | null, now: number) {
  if (!ride || detailPhase(ride, now) !== 'meetup') return false;
  return departsAt(ride) - now <= POLL_WINDOW_MS;
}

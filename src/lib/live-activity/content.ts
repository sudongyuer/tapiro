import type { TFunction } from 'i18next';
import type { LiveActivityState } from 'tapiro-kit';

import { localClock } from '../deviceClock';

const MINUTE = 60_000;
const STALE_GRACE_MS = 5 * MINUTE;
export const FINAL_LINGER_SECONDS = 15 * 60;

export type LiveActivityPlace = { name: string; home: boolean };

type BountyBase = { kind: 'bounty'; id: string; helper: string; place: string | null };
type RideBase = { kind: 'ride'; id: string; start: LiveActivityPlace };

export type LiveActivitySubject =
  | (BountyBase & { phase: 'onTheWay'; task: string; leftAt: number; etaAt: number })
  | (BountyBase & { phase: 'arrived'; leftAt: number; arrivedAt: number })
  | (RideBase & {
      phase: 'meetup';
      gatherAt: number;
      departAt: number;
      arrived: number;
      total: number;
    })
  | (RideBase & { phase: 'departed'; gatherAt: number; departedAt: number; aboard: number });

export type LiveActivityEnd = 'arrived' | 'departed' | 'cancelled';

export function liveActivityLink(subject: Pick<LiveActivitySubject, 'kind' | 'id'>) {
  const path = subject.kind === 'bounty' ? `bounty/status/${subject.id}` : `ride/${subject.id}`;
  return `tapiro://${path}`;
}

export function dismissAfterSeconds(end: LiveActivityEnd) {
  return end === 'cancelled' ? 0 : FINAL_LINGER_SECONDS;
}

function minutesUntil(target: number, now: number) {
  return Math.max(1, Math.ceil((target - now) / MINUTE));
}

function fraction(from: number, to: number, now: number) {
  if (to <= from) return 1;
  return Math.min(1, Math.max(0, (now - from) / (to - from)));
}

function startName(start: LiveActivityPlace, t: TFunction) {
  return start.home ? t('liveActivity.homeStart') : start.name;
}

export function liveActivityContent(
  subject: LiveActivitySubject,
  t: TFunction,
  now: number,
): LiveActivityState {
  const common = { unit: t('liveActivity.unit'), staleNote: t('liveActivity.stale') };
  switch (subject.phase) {
    case 'onTheWay': {
      const count = minutesUntil(subject.etaAt, now);
      return {
        ...common,
        title: t('liveActivity.bounty.onTheWay', { name: subject.helper, count }),
        detail: subject.place
          ? t('liveActivity.pair', { first: subject.place, second: subject.task })
          : subject.task,
        minutes: count,
        progress: fraction(subject.leftAt, subject.etaAt, now),
        startLabel: t('liveActivity.bounty.left', { time: localClock(subject.leftAt) }),
        endLabel: t('liveActivity.bounty.eta', { time: localClock(subject.etaAt) }),
        staleAfterSeconds: Math.max(0, (subject.etaAt + STALE_GRACE_MS - now) / 1000),
      };
    }
    case 'arrived':
      return {
        ...common,
        title: subject.place
          ? t('liveActivity.bounty.arrived', { name: subject.helper, place: subject.place })
          : t('liveActivity.bounty.arrivedPlain', { name: subject.helper }),
        detail: t('liveActivity.bounty.arrivedDetail'),
        progress: 1,
        startLabel: t('liveActivity.bounty.left', { time: localClock(subject.leftAt) }),
        endLabel: t('liveActivity.bounty.arrivedAt', { time: localClock(subject.arrivedAt) }),
      };
    case 'meetup': {
      const count = minutesUntil(subject.departAt, now);
      return {
        ...common,
        title: t('liveActivity.ride.meetup', { place: startName(subject.start, t) }),
        detail: t('liveActivity.ride.leaving', {
          count,
          arrived: subject.arrived,
          total: subject.total,
        }),
        minutes: count,
        progress: fraction(subject.gatherAt, subject.departAt, now),
        startLabel: t('liveActivity.ride.gatherAt', { time: localClock(subject.gatherAt) }),
        endLabel: t('liveActivity.ride.departAt', { time: localClock(subject.departAt) }),
        staleAfterSeconds: Math.max(0, (subject.departAt - now) / 1000),
      };
    }
    case 'departed':
      return {
        ...common,
        title: t('liveActivity.ride.departed', { place: startName(subject.start, t) }),
        detail: t('liveActivity.ride.aboard', { count: subject.aboard }),
        progress: 1,
        startLabel: t('liveActivity.ride.gatherAt', { time: localClock(subject.gatherAt) }),
        endLabel: t('liveActivity.ride.departedAt', { time: localClock(subject.departedAt) }),
      };
  }
}

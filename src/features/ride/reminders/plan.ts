import { outsideQuietHours } from '@/lib/notifications/quietHours';
import type { Money } from '@/lib/money';

import { NO_SHOW_WINDOW_MS, departsAt, gathersAt } from '../rideTimes';
import type { RidePhase, SplitMode } from '../types';

export const REMINDER_KINDS = ['meetup', 'goOrCancel', 'arrive', 'pay24', 'pay72'] as const;
export type ReminderKind = (typeof REMINDER_KINDS)[number];

export const PAY_REMINDER_HOURS = { pay24: 24, pay72: 72 } as const;

export type ReminderRide = {
  id: string;
  route: string;
  status: RidePhase;
  organiser: boolean;
  myStatus: string | null;
  departAt: string;
  revisedAt: string | null;
  seats: number;
  taken: number;
  splitMode: SplitMode;
  eta: string | null;
  dueSince: string | null;
  share: Money | null;
  organiserName: string | null;
};

export type PlannedReminder = { id: string; rideId: string; kind: ReminderKind; at: number };

const HOUR = 3_600_000;
const BEFORE_DEPARTURE: readonly RidePhase[] = ['open', 'gathering'];

export const reminderId = (rideId: string, kind: ReminderKind) => `ride:${rideId}:${kind}`;
export const RIDE_REMINDER_PREFIX = 'ride:';
export const rideScope = (rideId: string) => (id: string) => id.startsWith(`ride:${rideId}:`);
export const allRidesScope = (id: string) => id.startsWith(RIDE_REMINDER_PREFIX);

export function rideIdOf(id: string) {
  const [prefix, rideId] = id.split(':');
  return prefix === 'ride' && rideId ? rideId : null;
}

export function kindOf(id: string): ReminderKind | null {
  const kind = id.split(':')[2];
  return REMINDER_KINDS.find((candidate) => candidate === kind) ?? null;
}

export function planReminders(ride: ReminderRide): PlannedReminder[] {
  const planned: PlannedReminder[] = [];
  const add = (kind: ReminderKind, at: number) =>
    planned.push({ id: reminderId(ride.id, kind), rideId: ride.id, kind, at });
  const onRide = ride.organiser || ride.myStatus === 'accepted';
  if (BEFORE_DEPARTURE.includes(ride.status) && onRide) {
    add('meetup', gathersAt(ride));
    if (ride.organiser && ride.taken < ride.seats) {
      add('goOrCancel', departsAt(ride) - NO_SHOW_WINDOW_MS);
    }
  }
  if (ride.status === 'departed' && ride.organiser && ride.eta) {
    add('arrive', Date.parse(ride.eta));
  }
  if (
    ride.status === 'settling' &&
    !ride.organiser &&
    ride.myStatus === 'boarded' &&
    ride.dueSince &&
    ride.share
  ) {
    const due = Date.parse(ride.dueSince);
    for (const kind of ['pay24', 'pay72'] as const) {
      add(kind, outsideQuietHours(due + PAY_REMINDER_HOURS[kind] * HOUR));
    }
  }
  return planned.filter((reminder) => Number.isFinite(reminder.at));
}

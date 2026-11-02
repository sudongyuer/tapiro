import { CURRENCIES, type Money } from '@/lib/money';

import { farePeople, perPersonAbout } from './perPerson';
import { departsAt, gathersAt } from './rideTimes';
import type { RidePhase, RideRole, RideSummary } from './types';

export type TicketStatus =
  | { kind: 'leaving'; minutes: number }
  | { kind: 'requests'; count: number }
  | { kind: 'applied' }
  | { kind: 'full' }
  | { kind: 'mine'; need: number }
  | { kind: 'need'; need: number }
  | { kind: Exclude<RidePhase, 'open' | 'gathering'> };

export type TicketTone = 'urgent' | 'warning' | 'plain';

export type TicketMine = { role: RideRole; pendingRequests: number };

export type TicketModel = {
  status: TicketStatus;
  tone: TicketTone;
  muted: boolean;
  departs: number;
  perPerson: Money | null;
  taken: number;
  seats: number;
  airport: { flight: number | null; bags: number | null } | null;
};

const AFTER_DEPARTURE: readonly RidePhase[] = ['departed', 'arrived', 'settling', 'closed'];
const MUTED: readonly TicketStatus['kind'][] = ['full', 'closed', 'cancelled', 'expired'];

function statusOf(ride: RideSummary, now: number, mine: TicketMine | null): TicketStatus {
  const { status } = ride;
  if (status !== 'open' && status !== 'gathering') return { kind: status };
  const departs = departsAt(ride);
  if (now >= gathersAt(ride) && now < departs) {
    return { kind: 'leaving', minutes: Math.max(1, Math.ceil((departs - now) / 60_000)) };
  }
  if (mine?.role === 'organiser' && mine.pendingRequests > 0) {
    return { kind: 'requests', count: mine.pendingRequests };
  }
  if (mine?.role === 'applicant') return { kind: 'applied' };
  const need = Math.max(0, ride.seats - ride.taken);
  if (need === 0) return { kind: 'full' };
  return mine?.role === 'organiser' ? { kind: 'mine', need } : { kind: 'need', need };
}

function perPerson(ride: RideSummary): Money | null {
  if (!ride.estimate) return null;
  const boarded = AFTER_DEPARTURE.includes(ride.status) ? ride.taken : null;
  const people = Math.max(1, farePeople(ride.seats, boarded));
  const digits = CURRENCIES[ride.estimate.currency].minorDigits;
  return {
    minor: perPersonAbout(ride.estimate.minor, people, digits),
    currency: ride.estimate.currency,
  };
}

export function ticketModel(
  ride: RideSummary,
  now: number,
  mine: TicketMine | null = null,
): TicketModel {
  const status = statusOf(ride, now, mine);
  const tone: TicketTone =
    status.kind === 'leaving' ? 'urgent' : status.kind === 'requests' ? 'warning' : 'plain';
  const hasAirportLine = ride.flightDepartsAt !== null || (ride.largeBags ?? 0) > 0;
  return {
    status,
    tone,
    muted: MUTED.includes(status.kind),
    departs: departsAt(ride),
    perPerson: perPerson(ride),
    taken: ride.taken,
    seats: ride.seats,
    airport: hasAirportLine
      ? {
          flight: ride.flightDepartsAt ? Date.parse(ride.flightDepartsAt) : null,
          bags: ride.largeBags && ride.largeBags > 0 ? ride.largeBags : null,
        }
      : null,
  };
}

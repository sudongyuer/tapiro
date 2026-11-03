import { PLACE_KINDS, type PlaceKind } from '@/features/place/shortName';
import { toMoney } from '@/lib/money';

import type {
  MyRide,
  MyRides,
  NearbyCursor,
  NearbyPage,
  RidePhase,
  RidePlace,
  RideRole,
  RideSummary,
  ShortNameRow,
  SplitMode,
} from './types';

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
const ROLES: readonly RideRole[] = ['organiser', 'member', 'applicant'];

type Json = Record<string, unknown>;

const object = (value: unknown): Json => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('ride: expected an object');
  }
  return value as Json;
};

const text = (value: unknown, name: string) => {
  if (typeof value !== 'string' || value === '') throw new Error(`ride: ${name} is not text`);
  return value;
};

const optionalText = (value: unknown) => (typeof value === 'string' && value !== '' ? value : null);

const time = (value: unknown, name: string) => {
  const iso = text(value, name);
  if (Number.isNaN(Date.parse(iso))) throw new Error(`ride: ${name} is not a time`);
  return new Date(Date.parse(iso)).toISOString();
};

const optionalTime = (value: unknown, name: string) =>
  value === null || value === undefined ? null : time(value, name);

const count = (value: unknown, name: string) => {
  if (!Number.isInteger(value) || Number(value) < 0)
    throw new Error(`ride: ${name} is not a count`);
  return Number(value);
};

const kind = (value: unknown): PlaceKind | null =>
  PLACE_KINDS.find((candidate) => candidate === value) ?? null;

function place(value: unknown, name: string): RidePlace {
  const body = object(value);
  return {
    label: text(body.label, `${name}.label`),
    short: text(body.short, `${name}.short`),
    kind: kind(body.kind),
  };
}

export function toRideSummary(value: unknown): RideSummary {
  const body = object(value);
  const status = PHASES.find((phase) => phase === body.status);
  if (!status) throw new Error('ride: unknown status');
  const splitMode: SplitMode = body.splitMode === 'grab' ? 'grab' : 'tapiro';
  const estimateBody =
    body.estimate === null || body.estimate === undefined ? null : object(body.estimate);
  const estimate = estimateBody ? toMoney(estimateBody.minor, estimateBody.currency) : null;
  if (estimateBody && !estimate) throw new Error('ride: estimate has an unknown currency');
  const organiser =
    body.organiser === null || body.organiser === undefined ? null : object(body.organiser);
  return {
    id: text(body.id, 'id'),
    start: place(body.start, 'start'),
    dest: place(body.dest, 'dest'),
    departAt: time(body.departAt, 'departAt'),
    revisedAt: optionalTime(body.revisedAt, 'revisedAt'),
    day: text(body.day, 'day'),
    status,
    seats: count(body.seats, 'seats'),
    taken: count(body.taken, 'taken'),
    splitMode,
    estimate,
    airport: body.airport === true,
    flightDepartsAt: optionalTime(body.flightDepartsAt, 'flightDepartsAt'),
    largeBags:
      body.largeBags === null || body.largeBags === undefined
        ? null
        : count(body.largeBags, 'largeBags'),
    settledAt: optionalTime(body.settledAt, 'settledAt'),
    organiserName: organiser ? optionalText(organiser.name) : null,
  };
}

export function toMyRide(value: unknown): MyRide {
  const body = object(value);
  const role = ROLES.find((candidate) => candidate === body.role);
  if (!role) throw new Error('ride: unknown role');
  return {
    ...toRideSummary(body),
    role,
    myStatus: text(body.myStatus, 'myStatus'),
    pendingRequests:
      body.pendingRequests === null || body.pendingRequests === undefined
        ? 0
        : count(body.pendingRequests, 'pendingRequests'),
    myShare: toMoney(body.myShare, body.currency),
    myPaid: PAID.find((candidate) => candidate === body.myPaid) ?? null,
    myDueSince: optionalTime(body.myDueSince, 'myDueSince'),
    eta: optionalTime(body.eta, 'eta'),
  };
}

const PAID = ['due', 'paid', 'settled'] as const;

const list = (value: unknown, name: string) => {
  if (!Array.isArray(value)) throw new Error(`ride: ${name} is not a list`);
  return value as unknown[];
};

function cursor(value: unknown): NearbyCursor | null {
  if (value === null || value === undefined) return null;
  const body = object(value);
  const coordinate = (raw: unknown) => (typeof raw === 'number' ? raw : null);
  return {
    id: text(body.id, 'next.id'),
    latitude: coordinate(body.latitude),
    longitude: coordinate(body.longitude),
  };
}

export function toNearbyPage(value: unknown): NearbyPage {
  const body = object(value);
  return { items: list(body.items, 'items').map(toRideSummary), next: cursor(body.next) };
}

export function toMyRides(value: unknown): MyRides {
  const body = object(value);
  return {
    items: list(body.items, 'items').map(toMyRide),
    historyCount: count(body.historyCount, 'historyCount'),
  };
}

export function toHistory(value: unknown): RideSummary[] {
  return list(value, 'history').map(toRideSummary);
}

export function toShortNameRows(value: unknown): ShortNameRow[] {
  return list(value, 'place_short_names').flatMap((row) => {
    const body = object(row);
    const pattern = optionalText(body.pattern);
    const shortName = optionalText(body.short_name);
    return pattern && shortName ? [{ pattern, shortName, kind: kind(body.kind) }] : [];
  });
}

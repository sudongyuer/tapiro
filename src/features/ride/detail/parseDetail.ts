import { toRideSummary } from '../parse';
import {
  TIERS,
  type MemberStatus,
  type RideDetail,
  type RideDetails,
  type RideMember,
  type RidePerson,
  type RideRequest,
  type ViewerRole,
} from './types';

type Json = Record<string, unknown>;

const ROLES: readonly ViewerRole[] = ['organiser', 'member', 'applicant', 'viewer', 'noShow'];
const MEMBER_STATUSES: readonly MemberStatus[] = ['accepted', 'boarded', 'no_show', 'appealed'];

const object = (value: unknown, name: string): Json => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`ride detail: ${name} is not an object`);
  }
  return value as Json;
};

const optionalText = (value: unknown) => (typeof value === 'string' && value !== '' ? value : null);

const optionalTime = (value: unknown, name: string) => {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw new Error(`ride detail: ${name} is not a time`);
  }
  return new Date(Date.parse(value)).toISOString();
};

const time = (value: unknown, name: string) => {
  const parsed = optionalTime(value, name);
  if (parsed === null) throw new Error(`ride detail: ${name} is missing`);
  return parsed;
};

function oneOf<T extends string>(values: readonly T[], value: unknown, name: string): T {
  const found = values.find((candidate) => candidate === value);
  if (!found) throw new Error(`ride detail: unknown ${name}`);
  return found;
}

function person(value: unknown, name: string): RidePerson {
  const body = object(value, name);
  const id = optionalText(body.id);
  if (!id) throw new Error(`ride detail: ${name}.id is missing`);
  return {
    id,
    name: optionalText(body.name),
    tier: TIERS.find((tier) => tier === body.tier) ?? 'new_friend',
  };
}

function member(value: unknown): RideMember {
  const body = object(value, 'member');
  return {
    ...person(body, 'member'),
    status: oneOf(MEMBER_STATUSES, body.status, 'member status'),
    organiser: body.organiser === true,
    arrivedAt: optionalTime(body.arrivedAt, 'arrivedAt'),
    lateUntil: optionalTime(body.lateUntil, 'lateUntil'),
    lateAt: optionalTime(body.lateAt, 'lateAt'),
    joinedAt: optionalTime(body.joinedAt, 'joinedAt'),
  };
}

function request(value: unknown): RideRequest {
  const body = object(value, 'request');
  return {
    ...person(body, 'request'),
    note: optionalText(body.note),
    requestedAt: time(body.requestedAt, 'requestedAt'),
  };
}

function details(value: unknown): RideDetails | null {
  if (value === null || value === undefined) return null;
  const body = object(value, 'details');
  return {
    meetingNote: optionalText(body.meetingNote),
    plate: optionalText(body.plate),
    eta: optionalTime(body.eta, 'eta'),
  };
}

function rows<T>(value: unknown, name: string, parse: (row: unknown) => T): T[] | null {
  if (value === null || value === undefined) return null;
  if (!Array.isArray(value)) throw new Error(`ride detail: ${name} is not a list`);
  return value.map(parse);
}

function point(value: unknown) {
  const body = object(value, 'startPoint');
  const { latitude, longitude } = body;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    throw new Error('ride detail: startPoint has no coordinates');
  }
  return { latitude, longitude };
}

export function toRideDetail(value: unknown): RideDetail {
  const body = object(value, 'detail');
  const noShow = body.noShow === 'waived' || body.noShow === 'counted' ? body.noShow : null;
  return {
    ...toRideSummary(body),
    role: oneOf(ROLES, body.role, 'role'),
    myStatus: optionalText(body.myStatus),
    myNote: optionalText(body.myNote),
    arrivedAt: optionalTime(body.arrivedAt, 'arrivedAt'),
    lateUntil: optionalTime(body.lateUntil, 'lateUntil'),
    organiser:
      body.organiser === null || body.organiser === undefined
        ? null
        : person(body.organiser, 'organiser'),
    createdAt: time(body.createdAt, 'createdAt'),
    fullAt: optionalTime(body.fullAt, 'fullAt'),
    departedAt: optionalTime(body.departedAt, 'departedAt'),
    reachedAt: optionalTime(body.reachedAt, 'reachedAt'),
    appealEndsAt: optionalTime(body.appealEndsAt, 'appealEndsAt'),
    appealLapsed: body.appealLapsed === true,
    noShow,
    startPoint: point(body.startPoint),
    details: details(body.details),
    members: rows(body.members, 'members', member),
    requests: rows(body.requests, 'requests', request),
  };
}

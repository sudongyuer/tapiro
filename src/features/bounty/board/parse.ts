import type { Point } from '@/lib/location/types';
import { toMoney, type Money, type MoneyReference } from '@/lib/money';
import { bountyCategory } from '@/lib/stickers/category';
import { artOrNull } from '@/lib/stickers/parse';

import {
  APPLICATION_STATUSES,
  TIERS,
  VIEWER_ROLES,
  type BoardPage,
  type BoardRow,
  type BountyDetail,
  type Person,
  type ViewerRole,
} from './types';

type Body = Record<string, unknown>;

export const fail = (what: string): never => {
  throw new Error(`board read returned an unexpected ${what}`);
};

export const body = (value: unknown, what: string): Body =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Body)
    : fail(what);

export const text = (value: unknown, what: string): string =>
  typeof value === 'string' ? value : fail(what);

export const textOrNull = (value: unknown, what: string): string | null =>
  value === null || value === undefined ? null : text(value, what);

export const count = (value: unknown, what: string): number =>
  Number.isInteger(value) && Number(value) >= 0 ? Number(value) : fail(what);

const countOrNull = (value: unknown, what: string): number | null =>
  value === null || value === undefined ? null : count(value, what);

export const oneOf = <T extends string>(values: readonly T[], value: unknown, what: string): T =>
  values.find((candidate) => candidate === value) ?? fail(what);

export const money = (minor: unknown, currency: unknown, what: string): Money =>
  toMoney(minor, currency) ?? fail(what);

export function reward(row: Body): Money {
  const value = money(row.rewardMinor, row.rewardCurrency, 'reward');
  return value.minor >= 0 ? value : fail('reward');
}

function toReference(value: unknown): MoneyReference | null {
  if (value === null || value === undefined) return null;
  const reference = body(value, 'reference');
  return {
    ...money(reference.minor, reference.currency, 'reference'),
    rateDate: text(reference.rateDate, 'reference.rateDate'),
  };
}

const finite = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const coordinate = (value: unknown, limit: number, what: string): number =>
  typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit
    ? value
    : fail(what);

function toPoint(value: unknown): Point | null {
  if (value === null) return null;
  const point = body(value, 'point');
  return {
    latitude: coordinate(point.latitude, 90, 'point.latitude'),
    longitude: coordinate(point.longitude, 180, 'point.longitude'),
  };
}

function toPerson(value: unknown, what = 'poster'): Person {
  const person = body(value, what);
  return {
    id: text(person.id, `${what}.id`),
    name: textOrNull(person.name, `${what}.name`),
    tier: oneOf(TIERS, person.tier, `${what}.tier`),
  };
}

function toHelper(value: unknown, role: ViewerRole): Person | null {
  if (role !== 'poster' && role !== 'helper') return null;
  return value === null || value === undefined ? null : toPerson(value, 'helper');
}

export function toBoardRow(value: unknown): BoardRow {
  const row = body(value, 'row');
  return {
    id: text(row.id, 'id'),
    title: text(row.title, 'title'),
    category: bountyCategory(row.category) ?? fail('category'),
    art: artOrNull(row.art),
    reward: reward(row),
    reference: toReference(row.reference),
    placeLabel: textOrNull(row.placeLabel, 'placeLabel'),
    stickerPath: textOrNull(row.stickerPath, 'stickerPath'),
    startsAt: textOrNull(row.startsAt, 'startsAt'),
    endsAt: textOrNull(row.endsAt, 'endsAt'),
    deadlineAt: textOrNull(row.deadlineAt, 'deadlineAt'),
    urgent: row.urgent === true,
    distanceM: countOrNull(row.distanceM, 'distanceM'),
    point: toPoint(row.point),
    appliedByMe: row.appliedByMe === true,
    createdAt: text(row.createdAt, 'createdAt'),
    poster: toPerson(row.poster),
  };
}

export function toBoardPage(value: unknown): BoardPage {
  const page = body(value, 'page');
  if (!Array.isArray(page.items)) fail('items');
  const items = (page.items as unknown[]).map(toBoardRow);
  const next = page.next ?? null;
  const total = countOrNull(page.total, 'total');
  const beyondTotal = countOrNull(page.beyondTotal, 'beyondTotal');
  return {
    items,
    next,
    ...(total === null ? {} : { total }),
    ...(beyondTotal === null ? {} : { beyondTotal }),
  };
}

function toPlace(value: unknown): BountyDetail['place'] {
  if (value === null || value === undefined) return null;
  const place = body(value, 'place');
  const latitude = finite(place.latitude);
  const longitude = finite(place.longitude);
  return {
    label: text(place.label, 'place.label'),
    ...(latitude !== undefined && longitude !== undefined ? { latitude, longitude } : {}),
  };
}

function toApplication(value: unknown): BountyDetail['myApplication'] {
  if (value === null || value === undefined) return null;
  const application = body(value, 'myApplication');
  return {
    status: oneOf(APPLICATION_STATUSES, application.status, 'myApplication.status'),
    note: textOrNull(application.note, 'myApplication.note'),
  };
}

export function toBountyDetail(value: unknown): BountyDetail {
  const detail = body(value, 'detail');
  const viewerRole = oneOf(VIEWER_ROLES, detail.viewerRole, 'viewerRole');
  return {
    id: text(detail.id, 'id'),
    title: text(detail.title, 'title'),
    description: textOrNull(detail.description, 'description'),
    category: bountyCategory(detail.category) ?? fail('category'),
    art: artOrNull(detail.art),
    reward: reward(detail),
    reference: toReference(detail.reference),
    status: text(detail.status, 'status'),
    viewerRole,
    place: toPlace(detail.place),
    distanceM: countOrNull(detail.distanceM, 'distanceM'),
    address: textOrNull(detail.address, 'address'),
    startsAt: textOrNull(detail.startsAt, 'startsAt'),
    endsAt: textOrNull(detail.endsAt, 'endsAt'),
    deadlineAt: textOrNull(detail.deadlineAt, 'deadlineAt'),
    expiresAt: text(detail.expiresAt, 'expiresAt'),
    poster: toPerson(detail.poster),
    helper: toHelper(detail.helper, viewerRole),
    myApplication: toApplication(detail.myApplication),
  };
}

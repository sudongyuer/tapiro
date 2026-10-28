import { bountyCategory } from '@/lib/stickers/category';

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

const finite = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

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
    rewardSen: count(row.rewardSen, 'rewardSen'),
    placeLabel: textOrNull(row.placeLabel, 'placeLabel'),
    stickerPath: textOrNull(row.stickerPath, 'stickerPath'),
    startsAt: textOrNull(row.startsAt, 'startsAt'),
    endsAt: textOrNull(row.endsAt, 'endsAt'),
    deadlineAt: textOrNull(row.deadlineAt, 'deadlineAt'),
    urgent: row.urgent === true,
    distanceM: countOrNull(row.distanceM, 'distanceM'),
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
    rewardSen: count(detail.rewardSen, 'rewardSen'),
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

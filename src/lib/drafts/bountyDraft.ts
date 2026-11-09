import { CURRENCIES, isCurrencyCode, POST_LIMITS, type CurrencyCode } from '@/lib/money';
import { bountyCategory, type BountyCategory } from '@/lib/stickers/category';

export const BOUNTY_DRAFT_LIMITS = {
  titleMax: 60,
  descriptionMax: 500,
  placeHintMax: 80,
  timeAheadMs: 30 * 24 * 3_600_000,
} as const;

export type BountyDraftTime =
  | { kind: 'none' }
  | { kind: 'deadline'; deadlineAt: string }
  | { kind: 'window'; startsAt: string; endsAt: string };

export type BountyDraft = {
  title: string;
  category: BountyCategory | null;
  rewardMajor: number | null;
  currency: CurrencyCode | null;
  description: string | null;
  time: BountyDraftTime;
  placeHint: string | null;
};

export type BountyDraftFailure =
  | { reason: 'not_object' }
  | { reason: 'unknown_field' | 'missing_field' | 'invalid_field'; field: string };

export type BountyDraftParse =
  { ok: true; draft: BountyDraft } | ({ ok: false } & BountyDraftFailure);

export const BOUNTY_DRAFT_FIELDS = [
  'title',
  'category',
  'rewardMajor',
  'currency',
  'description',
  'deadlineAt',
  'startsAt',
  'endsAt',
  'placeHint',
] as const;

const OFFSET_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

const isDateTime = (value: unknown): value is string =>
  typeof value === 'string' && OFFSET_DATE_TIME.test(value) && !Number.isNaN(Date.parse(value));

function requiredText(value: unknown, max: number) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  const length = [...trimmed].length;
  return length >= 1 && length <= max ? trimmed : null;
}

function parseTime(fields: Record<string, unknown>): BountyDraftTime | { invalid: string } {
  const { deadlineAt, startsAt, endsAt } = fields;
  if (deadlineAt === null && startsAt === null && endsAt === null) return { kind: 'none' };
  if (deadlineAt !== null) {
    if (!isDateTime(deadlineAt)) return { invalid: 'deadlineAt' };
    if (startsAt !== null) return { invalid: 'startsAt' };
    if (endsAt !== null) return { invalid: 'endsAt' };
    return { kind: 'deadline', deadlineAt };
  }
  if (!isDateTime(startsAt)) return { invalid: 'startsAt' };
  if (!isDateTime(endsAt) || Date.parse(endsAt) <= Date.parse(startsAt))
    return { invalid: 'endsAt' };
  return { kind: 'window', startsAt, endsAt };
}

export function parseBountyDraft(value: unknown): BountyDraftParse {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, reason: 'not_object' };
  }
  const fields = value as Record<string, unknown>;
  const known: readonly string[] = BOUNTY_DRAFT_FIELDS;
  const unknown = Object.keys(fields).find((key) => !known.includes(key));
  if (unknown !== undefined) return { ok: false, reason: 'unknown_field', field: unknown };
  const missing = BOUNTY_DRAFT_FIELDS.find((key) => !Object.hasOwn(fields, key));
  if (missing !== undefined) return { ok: false, reason: 'missing_field', field: missing };
  const invalid = (field: string): BountyDraftParse => ({
    ok: false,
    reason: 'invalid_field',
    field,
  });

  const title = requiredText(fields.title, BOUNTY_DRAFT_LIMITS.titleMax);
  if (title === null) return invalid('title');
  const category = fields.category === null ? null : bountyCategory(fields.category);
  if (fields.category !== null && category === null) return invalid('category');
  const { rewardMajor } = fields;
  if (rewardMajor !== null && (!Number.isSafeInteger(rewardMajor) || (rewardMajor as number) < 1)) {
    return invalid('rewardMajor');
  }
  if (fields.currency !== null && !isCurrencyCode(fields.currency)) return invalid('currency');
  const description =
    fields.description === null
      ? null
      : requiredText(fields.description, BOUNTY_DRAFT_LIMITS.descriptionMax);
  if (fields.description !== null && description === null) return invalid('description');
  const placeHint =
    fields.placeHint === null
      ? null
      : requiredText(fields.placeHint, BOUNTY_DRAFT_LIMITS.placeHintMax);
  if (fields.placeHint !== null && placeHint === null) return invalid('placeHint');
  const time = parseTime(fields);
  if ('invalid' in time) return invalid(time.invalid);

  return {
    ok: true,
    draft: {
      title,
      category,
      rewardMajor: rewardMajor as number | null,
      currency: fields.currency as CurrencyCode | null,
      description,
      time,
      placeHint,
    },
  };
}

export type BountyFormFields = {
  title: string;
  art: null;
  category?: BountyCategory;
  categorySource?: 'auto';
  rewardText?: string;
  currency?: CurrencyCode;
  description?: string;
  time?: Exclude<BountyDraftTime, { kind: 'none' }>;
};

export type BountyFormPatch = { fields: BountyFormFields; placeHint: string | null };

function fitsReward(major: number, currency: CurrencyCode) {
  const { minMinor, maxMinor, stepMinor } = POST_LIMITS.bounty[currency];
  const minor = major * 10 ** CURRENCIES[currency].minorDigits;
  return minor >= minMinor && minor <= maxMinor && (minor - minMinor) % stepMinor === 0;
}

function pickableTime(time: BountyDraftTime, now: Date) {
  if (time.kind === 'none') return null;
  const first = Date.parse(time.kind === 'deadline' ? time.deadlineAt : time.startsAt);
  return first > now.getTime() && first <= now.getTime() + BOUNTY_DRAFT_LIMITS.timeAheadMs
    ? time
    : null;
}

// Only what the draft says goes into the patch, so a field the user already filled keeps its value. A reward or a time
// the form would refuse is left out instead of blocking the rest of the draft. A place needs coordinates a model cannot
// supply, so it comes back as a hint for the user to pick, never as a filled place.
export function toBountyFormPatch(
  draft: BountyDraft,
  form: { now: Date; currency: CurrencyCode },
): BountyFormPatch {
  const fields: BountyFormFields = { title: draft.title, art: null };
  if (draft.category !== null) {
    fields.category = draft.category;
    fields.categorySource = 'auto';
  }
  if (
    draft.rewardMajor !== null &&
    fitsReward(draft.rewardMajor, draft.currency ?? form.currency)
  ) {
    fields.rewardText = String(draft.rewardMajor);
    if (draft.currency !== null) fields.currency = draft.currency;
  }
  if (draft.description !== null) fields.description = draft.description;
  const time = pickableTime(draft.time, form.now);
  if (time !== null) fields.time = time;
  return { fields, placeHint: draft.placeHint };
}

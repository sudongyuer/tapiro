import { CURRENCIES, POST_LIMITS, type CurrencyCode, type Money } from '@/lib/money';

import type { DraftError, PostDraft, PublishArgs, TimeChoice } from './types';

export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 500;
export const PLACE_MAX = 80;
export const ADDRESS_MAX = 120;
export const POST_CURRENCY: CurrencyCode = 'MYR';
export const TIME_AHEAD_MS = 30 * 24 * 3_600_000;

type Checked<T> = { ok: true; value: T } | { ok: false; error: DraftError };
type TimeArgs = Pick<PublishArgs, 'starts_at' | 'ends_at' | 'deadline_at'>;

const FULL_WIDTH_ZERO = 0xff10;

export function codePoints(text: string) {
  return [...text].length;
}

export function rewardLimits(currency: CurrencyCode) {
  const { minMinor, maxMinor, stepMinor } = POST_LIMITS.bounty[currency];
  const unit = 10 ** CURRENCIES[currency].minorDigits;
  return {
    min: { minor: minMinor, currency } satisfies Money,
    max: { minor: maxMinor, currency } satisfies Money,
    step: stepMinor,
    minMajor: minMinor / unit,
    maxMajor: maxMinor / unit,
  };
}

export function parseReward(text: string, currency: CurrencyCode): Money | null {
  const digits = text
    .trim()
    .replace(/[０-９]/g, (digit) => String(digit.charCodeAt(0) - FULL_WIDTH_ZERO));
  if (!/^[0-9]+$/.test(digits)) return null;
  const minor = Number(digits) * 10 ** CURRENCIES[currency].minorDigits;
  const { min, max, step } = rewardLimits(currency);
  const fits = minor >= min.minor && minor <= max.minor && (minor - min.minor) % step === 0;
  return fits ? { minor, currency } : null;
}

function future(iso: string, now: Date): Checked<string> {
  const time = Date.parse(iso);
  if (Number.isNaN(time) || time <= now.getTime()) return { ok: false, error: 'timePast' };
  if (time > now.getTime() + TIME_AHEAD_MS) return { ok: false, error: 'timeTooFar' };
  return { ok: true, value: new Date(time).toISOString() };
}

function checkTime(time: TimeChoice, now: Date): Checked<TimeArgs> {
  if (time.kind === 'none') {
    return { ok: true, value: { starts_at: null, ends_at: null, deadline_at: null } };
  }
  if (time.kind === 'deadline') {
    const deadline = future(time.deadlineAt, now);
    if (!deadline.ok) return deadline;
    return { ok: true, value: { starts_at: null, ends_at: null, deadline_at: deadline.value } };
  }
  const start = future(time.startsAt, now);
  if (!start.ok) return start;
  const end = Date.parse(time.endsAt);
  if (Number.isNaN(end) || end <= Date.parse(start.value)) {
    return { ok: false, error: 'windowOrder' };
  }
  return {
    ok: true,
    value: { starts_at: start.value, ends_at: new Date(end).toISOString(), deadline_at: null },
  };
}

function optionalText(text: string | null) {
  const trimmed = text?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

export function checkDraft(
  draft: PostDraft,
  now: Date,
): { ok: true; args: PublishArgs } | { ok: false; error: DraftError } {
  const title = draft.title.trim();
  if (title === '') return { ok: false, error: 'titleEmpty' };
  if (codePoints(title) > TITLE_MAX) return { ok: false, error: 'titleTooLong' };
  if (!draft.category) return { ok: false, error: 'categoryEmpty' };
  if (draft.rewardText.trim() === '') return { ok: false, error: 'rewardEmpty' };
  const reward = parseReward(draft.rewardText, POST_CURRENCY);
  if (reward === null) return { ok: false, error: 'rewardRange' };
  const time = checkTime(draft.time, now);
  if (!time.ok) return time;
  const description = optionalText(draft.description);
  if (description !== null && codePoints(description) > DESCRIPTION_MAX) {
    return { ok: false, error: 'descriptionTooLong' };
  }
  const place = draft.place;
  const placeLabel = place ? place.label.trim() : null;
  if (placeLabel === '') return { ok: false, error: 'placeEmpty' };
  if (placeLabel !== null && codePoints(placeLabel) > PLACE_MAX) {
    return { ok: false, error: 'placeTooLong' };
  }
  const address = optionalText(place?.address ?? null);
  if (address !== null && codePoints(address) > ADDRESS_MAX) {
    return { ok: false, error: 'addressTooLong' };
  }
  return {
    ok: true,
    args: {
      id: draft.id,
      title,
      category: draft.category,
      reward_minor: reward.minor,
      reward_currency: reward.currency,
      description,
      place_label: placeLabel,
      latitude: place ? place.latitude : null,
      longitude: place ? place.longitude : null,
      address,
      ...time.value,
    },
  };
}

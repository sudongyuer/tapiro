import { validShortName } from '@/features/place/shortName';
import {
  CURRENCIES,
  POST_LIMITS,
  type CurrencyCode,
  type DecimalSeparator,
  type Money,
} from '@/lib/money';

import { malaysiaDayKey, malaysiaTime } from '../rideClock';
import type { PublishRideArgs } from '../types';
import { BAGS_MAX, SEATS, type RideDraft } from './draft';

export const LABEL_MAX = 80;
export const NOTE_MAX = 140;
export const DEPART_AHEAD_MS = 30 * 86_400_000;
const DAY_MS = 86_400_000;

export const RIDE_DRAFT_ERRORS = [
  'startEmpty',
  'destEmpty',
  'shortName',
  'timeEmpty',
  'timePast',
  'timeTooFar',
  'estimateRange',
  'noteTooLong',
] as const;

export type RideDraftError = (typeof RIDE_DRAFT_ERRORS)[number];

export const codePoints = (text: string) => Array.from(text).length;

export function parseEstimate(
  text: string,
  currency: CurrencyCode,
  decimal: DecimalSeparator = '.',
): Money | null {
  const cleaned = text.trim();
  const digits = CURRENCIES[currency].minorDigits;
  const point = decimal === ',' ? ',' : '\\.';
  if (!new RegExp(`^\\d+(${point}\\d{0,${digits}})?$`).test(cleaned)) return null;
  const [units, fraction = ''] = cleaned.split(decimal);
  const minor = Number(units) * 10 ** digits + Number(fraction.padEnd(digits, '0') || '0');
  return Number.isSafeInteger(minor) ? { minor, currency } : null;
}

export function estimateLimits(currency: CurrencyCode) {
  return POST_LIMITS.ride[currency];
}

export function flightTime(departAt: string, clock: string): string {
  const [hours, minutes] = clock.split(':').map(Number);
  const departs = Date.parse(departAt);
  const sameDay = malaysiaTime(malaysiaDayKey(departs), hours, minutes);
  return new Date(sameDay > departs ? sameDay : sameDay + DAY_MS).toISOString();
}

export type CheckedDraft =
  { ok: true; args: PublishRideArgs } | { ok: false; error: RideDraftError };

export function checkRideDraft(
  draft: RideDraft,
  now: Date,
  decimal: DecimalSeparator = '.',
): CheckedDraft {
  const { start, dest } = draft;
  if (!start || codePoints(start.label.trim()) > LABEL_MAX)
    return { ok: false, error: 'startEmpty' };
  if (!dest || codePoints(dest.label.trim()) > LABEL_MAX) return { ok: false, error: 'destEmpty' };
  if (!validShortName(start.short) || !validShortName(dest.short)) {
    return { ok: false, error: 'shortName' };
  }
  if (!draft.departAt) return { ok: false, error: 'timeEmpty' };
  const departs = Date.parse(draft.departAt);
  if (!(departs > now.getTime())) return { ok: false, error: 'timePast' };
  if (departs > now.getTime() + DEPART_AHEAD_MS) return { ok: false, error: 'timeTooFar' };
  let estimate: Money | null = null;
  if (draft.estimateText.trim() !== '') {
    estimate = parseEstimate(draft.estimateText, draft.currency, decimal);
    const limits = estimateLimits(draft.currency);
    if (!estimate || estimate.minor < limits.minMinor || estimate.minor > limits.maxMinor) {
      return { ok: false, error: 'estimateRange' };
    }
  }
  const flight =
    draft.airportOpen && draft.flightClock ? flightTime(draft.departAt, draft.flightClock) : null;
  const note = draft.noteOpen ? draft.note.trim() : '';
  if (codePoints(note) > NOTE_MAX) return { ok: false, error: 'noteTooLong' };
  const seats = Math.min(SEATS.max, Math.max(SEATS.min, Math.round(draft.seats)));
  const bags = draft.airportOpen ? Math.min(BAGS_MAX, Math.max(0, draft.largeBags)) : 0;
  return {
    ok: true,
    args: {
      id: draft.id,
      start_label: start.label.trim(),
      start_short: start.short.trim(),
      start_latitude: start.latitude,
      start_longitude: start.longitude,
      dest_label: dest.label.trim(),
      dest_short: dest.short.trim(),
      dest_latitude: dest.latitude,
      dest_longitude: dest.longitude,
      depart_at: new Date(departs).toISOString(),
      seats,
      currency: draft.currency,
      split_mode: draft.splitMode,
      estimate_minor: estimate?.minor ?? null,
      flight_departs_at: flight,
      large_bags: draft.airportOpen && bags > 0 ? bags : null,
      meeting_note: note === '' ? null : note,
    },
  };
}

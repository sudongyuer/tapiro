import type { HandArtId } from '@/lib/handArt';
import type { CurrencyCode } from '@/lib/money';
import type { BountyCategory } from '@/lib/stickers/category';

import { TIME_AHEAD_MS } from './validate';

export type TimePickId =
  | 'withinHalfHour'
  | 'withinHour'
  | 'tonight'
  | 'tomorrowNoon'
  | 'today'
  | 'tomorrowMorning'
  | 'tomorrow'
  | 'weekend';

export type TimePick =
  | { id: TimePickId; inMinutes: number }
  | { id: TimePickId; day: 0 | 1 | 'weekend'; at: [number, number] };

export type KindCategory = Exclude<BountyCategory, 'handle' | 'other'>;

export type PostKind = {
  category: KindCategory;
  art: HandArtId;
  suggestMajor: [number, number];
  amountsMajor: [number, number, number, number];
  picks: [TimePick, TimePick, TimePick];
};

export const POST_KINDS: readonly PostKind[] = [
  {
    category: 'pickup',
    art: 'parcel',
    suggestMajor: [5, 8],
    amountsMajor: [5, 6, 8, 10],
    picks: [
      { id: 'withinHour', inMinutes: 60 },
      { id: 'tonight', day: 0, at: [21, 0] },
      { id: 'tomorrowNoon', day: 1, at: [12, 0] },
    ],
  },
  {
    category: 'buy',
    art: 'tea',
    suggestMajor: [3, 6],
    amountsMajor: [3, 4, 5, 6],
    picks: [
      { id: 'withinHalfHour', inMinutes: 30 },
      { id: 'withinHour', inMinutes: 60 },
      { id: 'tonight', day: 0, at: [21, 0] },
    ],
  },
  {
    category: 'queue',
    art: 'queue',
    suggestMajor: [15, 30],
    amountsMajor: [15, 20, 25, 30],
    picks: [
      { id: 'today', day: 0, at: [17, 0] },
      { id: 'tomorrowMorning', day: 1, at: [12, 0] },
      { id: 'weekend', day: 'weekend', at: [12, 0] },
    ],
  },
  {
    category: 'move',
    art: 'move',
    suggestMajor: [20, 40],
    amountsMajor: [20, 30, 40, 50],
    picks: [
      { id: 'today', day: 0, at: [20, 0] },
      { id: 'tomorrow', day: 1, at: [20, 0] },
      { id: 'weekend', day: 'weekend', at: [18, 0] },
    ],
  },
  {
    category: 'accompany',
    art: 'accompany',
    suggestMajor: [20, 50],
    amountsMajor: [20, 30, 40, 50],
    picks: [
      { id: 'today', day: 0, at: [18, 0] },
      { id: 'tomorrow', day: 1, at: [18, 0] },
      { id: 'weekend', day: 'weekend', at: [18, 0] },
    ],
  },
  {
    category: 'study',
    art: 'study',
    suggestMajor: [15, 30],
    amountsMajor: [15, 20, 25, 30],
    picks: [
      { id: 'tonight', day: 0, at: [22, 0] },
      { id: 'tomorrow', day: 1, at: [22, 0] },
      { id: 'weekend', day: 'weekend', at: [22, 0] },
    ],
  },
];

const GENERAL_PICKS: PostKind['picks'] = [
  { id: 'today', day: 0, at: [21, 0] },
  { id: 'tomorrow', day: 1, at: [21, 0] },
  { id: 'weekend', day: 'weekend', at: [21, 0] },
];

const GENERAL_AMOUNTS: Record<CurrencyCode, PostKind['amountsMajor']> = {
  MYR: [5, 10, 15, 20],
  CNY: [10, 20, 30, 50],
};

export function postKind(category: BountyCategory | null): PostKind | null {
  return POST_KINDS.find((kind) => kind.category === category) ?? null;
}

export function rewardAmounts(category: BountyCategory | null, currency: CurrencyCode) {
  const kind = postKind(category);
  return currency === 'MYR' && kind ? kind.amountsMajor : GENERAL_AMOUNTS[currency];
}

export function rewardSuggestion(category: BountyCategory | null, currency: CurrencyCode) {
  const kind = postKind(category);
  return currency === 'MYR' && kind ? kind.suggestMajor : null;
}

export function timePicks(category: BountyCategory | null) {
  return postKind(category)?.picks ?? GENERAL_PICKS;
}

const STEP_MS = 5 * 60_000;
const SATURDAY = 6;

export function pickTime(pick: TimePick, now: Date): Date | null {
  let at: Date;
  if ('inMinutes' in pick) {
    at = new Date(Math.ceil((now.getTime() + pick.inMinutes * 60_000) / STEP_MS) * STEP_MS);
  } else {
    at = new Date(now);
    const ahead = pick.day === 'weekend' ? (SATURDAY - now.getDay() + 7) % 7 : pick.day;
    at.setDate(at.getDate() + ahead);
    at.setHours(pick.at[0], pick.at[1], 0, 0);
  }
  const lead = at.getTime() - now.getTime();
  return lead > 0 && lead <= TIME_AHEAD_MS ? at : null;
}

export function shownPicks(category: BountyCategory | null, now: Date) {
  return timePicks(category).flatMap((pick) => {
    const at = pickTime(pick, now);
    return at ? [{ id: pick.id, at }] : [];
  });
}

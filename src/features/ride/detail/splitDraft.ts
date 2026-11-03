import {
  CURRENCIES,
  POST_LIMITS,
  type CurrencyCode,
  type DecimalSeparator,
  type Money,
} from '@/lib/money';

import { parseEstimate } from '../create/validate';
import { equalSplit, organiserShare, splitProblem, type SplitProblem } from '../split';
import type { RideDetail, SplitInput } from './types';

export type ReceiptDraft =
  | { status: 'none' }
  | { status: 'expired' }
  | { status: 'picked' | 'uploading' | 'failed'; uri: string }
  | { status: 'uploaded'; uri: string; path: string };

export type SplitDraft = {
  totalText: string;
  shares: Record<string, string>;
  receipt: ReceiptDraft;
};

export const emptySplit = (): SplitDraft => ({
  totalText: '',
  shares: {},
  receipt: { status: 'none' },
});

export type SplitRow = { id: string; name: string | null; share: Money | null; edited: boolean };

export type SplitIssue = SplitProblem | 'totalEmpty' | 'totalRange' | 'shareText';

export type SplitView = {
  currency: CurrencyCode;
  total: Money | null;
  rows: SplitRow[];
  organiser: Money | null;
  extra: Money | null;
  equal: boolean;
  issue: SplitIssue | null;
};

export const splitRiders = (ride: RideDetail) =>
  (ride.members ?? []).filter((m) => m.status === 'boarded' && !m.organiser);

export function shareText(money: Money, decimal: DecimalSeparator = '.') {
  const digits = CURRENCIES[money.currency].minorDigits;
  return (money.minor / 10 ** digits).toFixed(digits).replace('.', decimal);
}

export function splitView(
  ride: RideDetail,
  draft: SplitDraft,
  decimal: DecimalSeparator = '.',
): SplitView {
  const currency = ride.currency;
  const riders = splitRiders(ride);
  const digits = CURRENCIES[currency].minorDigits;
  const limits = POST_LIMITS.ride[currency];
  const total =
    draft.totalText.trim() === '' ? null : parseEstimate(draft.totalText, currency, decimal);
  const inRange =
    total !== null && total.minor >= limits.minMinor && total.minor <= limits.maxMinor;
  const equal =
    inRange && riders.length > 0 ? equalSplit(total.minor, riders.length + 1, digits) : null;
  let badText = false;
  const rows = riders.map((m): SplitRow => {
    const typed = draft.shares[m.id];
    if (typed === undefined) {
      return {
        id: m.id,
        name: m.name,
        share: equal ? { minor: equal.rider, currency } : null,
        edited: false,
      };
    }
    const parsed = parseEstimate(typed, currency, decimal);
    if (!parsed) badText = true;
    return { id: m.id, name: m.name, share: parsed, edited: true };
  });
  const minors = rows.flatMap((row) => (row.share ? [row.share.minor] : []));
  const complete = minors.length === rows.length;
  const remainder = inRange && complete ? organiserShare(total.minor, minors) : -1;
  const organiser = remainder >= 0 ? { minor: remainder, currency } : null;
  const anyEdited = rows.some((row) => row.edited);
  const extraMinor = equal && !anyEdited ? equal.rider - equal.organiser : 0;
  const issue: SplitIssue | null =
    total === null
      ? draft.totalText.trim() === ''
        ? 'totalEmpty'
        : 'totalRange'
      : !inRange
        ? 'totalRange'
        : badText || !complete
          ? 'shareText'
          : splitProblem(total.minor, minors);
  return {
    currency,
    total,
    rows,
    organiser,
    extra: extraMinor > 0 ? { minor: extraMinor, currency } : null,
    equal: !anyEdited,
    issue,
  };
}

export function toSplitInput(view: SplitView, receipt: string | null): SplitInput | null {
  if (view.issue !== null || !view.total) return null;
  return {
    totalMinor: view.total.minor,
    shares: view.rows.map((row) => ({ memberId: row.id, minor: row.share?.minor ?? 0 })),
    receipt,
  };
}

export type TypedSplit = { total: string | null; shares: Record<string, string> };

export function syncedDraft(
  draft: SplitDraft,
  rows: readonly { id: string; shown: string; edited: boolean }[],
  typed: TypedSplit,
): SplitDraft {
  const shares = { ...draft.shares };
  for (const row of rows) {
    const text = typed.shares[row.id];
    if (text !== undefined && (row.edited || text !== row.shown)) shares[row.id] = text;
  }
  return { ...draft, totalText: typed.total ?? draft.totalText, shares };
}

import { convertUp, type CurrencyCode, type Money } from '@/lib/money';

import type { FxRate } from './types';

export const FX_MAX_AGE_DAYS = 7;
export const FX_TERMS_URL = 'https://www.bnm.gov.my/terms-of-use-bnm-datasets';
const DAY_MS = 86_400_000;

export function freshRate(rate: FxRate | null, now: Date) {
  if (!rate || !(rate.quotePerBase > 0)) return null;
  const age = now.getTime() - Date.parse(`${rate.rateDate}T00:00:00+08:00`);
  return age <= FX_MAX_AGE_DAYS * DAY_MS ? rate : null;
}

export function convertedAt(
  amount: Money,
  target: CurrencyCode,
  rate: FxRate | null,
  now: Date,
): Money | null {
  const fresh = freshRate(rate, now);
  if (!fresh || amount.currency === target) return null;
  const converted = convertUp(amount, fresh.quotePerBase, fresh.base, fresh.quote);
  return converted?.currency === target ? converted : null;
}

export function pairedReference(amount: Money, rate: FxRate | null, now: Date) {
  if (!rate) return null;
  return convertedAt(amount, rate.base === amount.currency ? rate.quote : rate.base, rate, now);
}

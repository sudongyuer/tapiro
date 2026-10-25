import type { FxRate } from './types';

export const FX_MAX_AGE_DAYS = 7;
export const FX_TERMS_URL = 'https://www.bnm.gov.my/terms-of-use-bnm-datasets';
const DAY_MS = 86_400_000;

export function freshRate(rate: FxRate | null, now: Date) {
  if (!rate || !(rate.rmPerCny > 0)) return null;
  const age = now.getTime() - Date.parse(`${rate.rateDate}T00:00:00+08:00`);
  return age <= FX_MAX_AGE_DAYS * DAY_MS ? rate : null;
}

export function cnyFen(amountSen: number, rate: FxRate | null, now: Date) {
  const fresh = freshRate(rate, now);
  return fresh ? Math.round(amountSen / fresh.rmPerCny) : null;
}

export function formatCny(fen: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(fen / 100);
}

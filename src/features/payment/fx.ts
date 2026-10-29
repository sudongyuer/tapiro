import { convertUp, CURRENCIES, type CurrencyCode, type Money } from '@/lib/money';

import type { FxRate } from './types';

export const FX_TERMS_URL = 'https://www.bnm.gov.my/terms-of-use-bnm-datasets';
const RATE_DIGITS = 4;

export function lockedConversion(amount: Money, rate: FxRate | null): Money | null {
  return rate ? convertUp(amount, rate.quotePerBase, rate.base, rate.quote) : null;
}

function withSymbol(currency: CurrencyCode, digits: string) {
  const { symbol, spaced } = CURRENCIES[currency];
  return `${symbol}${spaced ? ' ' : ''}${digits}`;
}

export function rateText(rate: FxRate, from: CurrencyCode, locale: string) {
  if (rate.base === rate.quote || (from !== rate.base && from !== rate.quote)) return null;
  const to = from === rate.base ? rate.quote : rate.base;
  const perUnit = from === rate.base ? rate.quotePerBase : 1 / rate.quotePerBase;
  const fixed = new Intl.NumberFormat(locale, {
    minimumFractionDigits: RATE_DIGITS,
    maximumFractionDigits: RATE_DIGITS,
  });
  const date = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${rate.rateDate}T00:00:00Z`));
  const one = new Intl.NumberFormat(locale).format(1);
  return {
    date,
    rate: `${withSymbol(from, one)} = ${withSymbol(to, fixed.format(perUnit))}`,
  };
}

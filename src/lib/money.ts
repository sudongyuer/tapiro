import type { PayeeType } from './payeeMethods';

export const CURRENCIES = {
  MYR: { minorDigits: 2, symbol: 'RM', spaced: true },
  CNY: { minorDigits: 2, symbol: '¥', spaced: false },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;
export type Money = { minor: number; currency: CurrencyCode };
export type MoneyReference = Money & { rateDate: string };

export type PostLimit = { minMinor: number; maxMinor: number; stepMinor: number };

export const POST_LIMITS: Readonly<Record<'bounty', Readonly<Record<CurrencyCode, PostLimit>>>> = {
  bounty: {
    MYR: { minMinor: 100, maxMinor: 50000, stepMinor: 100 },
    CNY: { minMinor: 100, maxMinor: 80000, stepMinor: 100 },
  },
};

export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && Object.hasOwn(CURRENCIES, value);
}

export function toMoney(minor: unknown, currency: unknown): Money | null {
  return Number.isSafeInteger(minor) && isCurrencyCode(currency)
    ? { minor: minor as number, currency }
    : null;
}

// Hermes's formatToParts crashed the app with heap corruption on the iOS 26 Simulator, and Apple's locale data
// spells MYR as the ISO code in zh-Hans and en, so digits come from a plain number format and the symbol from the
// currencies mirror.
export function moneyParts(money: Money, locale: string, { whole = false } = {}) {
  const { minorDigits, symbol, spaced } = CURRENCIES[money.currency];
  const gap = spaced ? '\u00a0' : '';
  const scale = 10 ** minorDigits;
  const digits = whole && money.minor % scale === 0 ? 0 : minorDigits;
  const text = new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Math.abs(money.minor) / scale);
  const match = digits > 0 ? /^(.*)([.,]\d+)$/.exec(text) : null;
  const sign = money.minor < 0 ? '-' : '';
  return match
    ? { symbol, gap, whole: `${sign}${match[1]}`, fraction: match[2] }
    : { symbol, gap, whole: `${sign}${text}`, fraction: '' };
}

export function formatMoney(money: Money, locale: string, options: { whole?: boolean } = {}) {
  const { symbol, gap, whole, fraction } = moneyParts(money, locale, options);
  const sign = whole.startsWith('-') ? '-' : '';
  return `${sign}${symbol}${gap}${whole.slice(sign.length)}${fraction}`;
}

export function formatMoneyRange(min: Money, max: Money, locale: string) {
  const from = moneyParts(min, locale, { whole: true });
  const to = moneyParts(max, locale, { whole: true });
  return `${from.symbol}${from.gap}${from.whole}${from.fraction}–${to.whole}${to.fraction}`;
}

export function defaultCurrency(regionCurrency: string | null | undefined): CurrencyCode {
  return isCurrencyCode(regionCurrency) ? regionCurrency : 'MYR';
}

const RATE_DIGITS = 8;

function scaledRate(quotePerBase: number) {
  const [units, fraction = ''] = quotePerBase.toFixed(RATE_DIGITS).split('.');
  return BigInt(units + fraction);
}

function ceilDiv(numerator: bigint, denominator: bigint) {
  const quotient = numerator / denominator;
  return numerator % denominator === BigInt(0) ? quotient : quotient + BigInt(1);
}

export function convertUp(
  money: Money,
  quotePerBase: number,
  base: CurrencyCode,
  quote: CurrencyCode,
): Money | null {
  if (!(quotePerBase > 0) || money.minor < 0 || base === quote) return null;
  const to = money.currency === base ? quote : money.currency === quote ? base : null;
  if (!to) return null;
  const rate = scaledRate(quotePerBase);
  const one = BigInt(10) ** BigInt(RATE_DIGITS);
  const shift = CURRENCIES[to].minorDigits - CURRENCIES[money.currency].minorDigits;
  const shiftUp = BigInt(10) ** BigInt(Math.max(shift, 0));
  const shiftDown = BigInt(10) ** BigInt(Math.max(-shift, 0));
  const amount = BigInt(money.minor) * shiftUp;
  const minor =
    money.currency === base
      ? ceilDiv(amount * rate, one * shiftDown)
      : ceilDiv(amount * one, rate * shiftDown);
  return { minor: Number(minor), currency: to };
}

export function methodCurrency(type: PayeeType, itemCurrency: CurrencyCode): CurrencyCode {
  switch (type) {
    case 'duitnow_id':
    case 'bank_account':
    case 'duitnow_qr':
      return 'MYR';
    case 'alipay':
    case 'wechat':
      return 'CNY';
    case 'cash':
      return itemCurrency;
  }
}

export function totalsByCurrency(amounts: readonly Money[]): Money[] {
  const totals = new Map<CurrencyCode, number>();
  for (const { minor, currency } of amounts) {
    totals.set(currency, (totals.get(currency) ?? 0) + minor);
  }
  return [...totals].map(([currency, minor]) => ({ minor, currency }));
}

import { CURRENCIES, isCurrencyCode, type CurrencyCode, type Money } from '@/lib/money';

export const RECEIPT_DRAFT_FIELDS = ['total', 'currency'] as const;

const TOTAL = /^(0|[1-9]\d{0,5})(?:\.(\d{1,2}))?$/;

export type ReceiptReading =
  { kind: 'read'; total: Money } | { kind: 'otherCurrency'; total: Money } | { kind: 'unreadable' };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function toMinor(text: string, currency: CurrencyCode): number | null {
  const match = TOTAL.exec(text);
  if (!match) return null;
  const digits = CURRENCIES[currency].minorDigits;
  const fraction = (match[2] ?? '').padEnd(digits, '0');
  if (fraction.length > digits) return null;
  const minor = Number(match[1]) * 10 ** digits + Number(fraction || '0');
  return minor > 0 ? minor : null;
}

export function parseReceiptReply(
  body: unknown,
  rideCurrency: CurrencyCode,
): ReceiptReading | null {
  if (!isRecord(body) || body.tool !== 'draft_split' || !isRecord(body.result)) return null;
  const { total, currency } = body.result;
  if (total === null) return { kind: 'unreadable' };
  if (typeof total !== 'string') return null;
  if (currency !== null && !isCurrencyCode(currency)) return null;
  const read = currency ?? rideCurrency;
  const minor = toMinor(total, read);
  if (minor === null) return null;
  const money = { minor, currency: read };
  return read === rideCurrency
    ? { kind: 'read', total: money }
    : { kind: 'otherCurrency', total: money };
}

export type ReceiptReadFailure =
  'offline' | 'providerError' | 'busy' | 'hungry' | 'capped' | 'needsUpdate' | 'image';

export type ReceiptReadOutcome =
  ReceiptReading | { kind: 'failed'; reason: ReceiptReadFailure } | { kind: 'declined' };

export type ReceiptReader = {
  read(uri: string, currency: CurrencyCode, openConsent: () => void): Promise<ReceiptReadOutcome>;
};

import type { UnsettledPayment } from './types';

function isUnsettledPayment(value: unknown): value is UnsettledPayment {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.counterpartName === 'string' &&
    Number.isInteger(item.amountSen) &&
    (item.amountSen as number) >= 0 &&
    (item.direction === 'owe' || item.direction === 'owed')
  );
}

export function parseUnsettledPayments(body: unknown): UnsettledPayment[] {
  if (typeof body !== 'object' || body === null) return [];
  const payments = (body as { payments?: unknown }).payments;
  return Array.isArray(payments) ? payments.filter(isUnsettledPayment) : [];
}

export async function readUnsettledPayments(response: unknown): Promise<UnsettledPayment[]> {
  if (!(response instanceof Response)) return [];
  try {
    return parseUnsettledPayments(await response.json());
  } catch {
    return [];
  }
}

export function formatRinggit(sen: number, locale: string) {
  // Apple's locale data (used by Hermes on iOS) spells MYR as the ISO code in zh-Hans and en and
  // ignores currencyDisplay 'narrowSymbol'; Malaysians read RM in every language. Hermes's
  // formatToParts crashed the app with heap corruption on the iOS 26 Simulator, so swap the text.
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'MYR' })
    .format(sen / 100)
    .replace('MYR', 'RM');
}

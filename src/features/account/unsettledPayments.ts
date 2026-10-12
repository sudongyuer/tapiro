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

export function formatRinggit(sen: number) {
  return `RM ${(sen / 100).toFixed(2)}`;
}

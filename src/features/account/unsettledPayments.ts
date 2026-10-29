import { toMoney } from '@/lib/money';

import type { UnsettledPayment } from './types';

function toUnsettledPayment(value: unknown): UnsettledPayment[] {
  if (typeof value !== 'object' || value === null) return [];
  const item = value as Record<string, unknown>;
  const amount = toMoney(item.amountMinor, item.currency);
  if (
    typeof item.id !== 'string' ||
    typeof item.title !== 'string' ||
    typeof item.counterpartName !== 'string' ||
    !amount ||
    amount.minor < 0 ||
    (item.direction !== 'owe' && item.direction !== 'owed')
  ) {
    return [];
  }
  return [
    {
      id: item.id,
      title: item.title,
      counterpartName: item.counterpartName,
      amount,
      direction: item.direction,
    },
  ];
}

export function parseUnsettledPayments(body: unknown): UnsettledPayment[] {
  if (typeof body !== 'object' || body === null) return [];
  const payments = (body as { payments?: unknown }).payments;
  return Array.isArray(payments) ? payments.flatMap(toUnsettledPayment) : [];
}

export async function readUnsettledPayments(response: unknown): Promise<UnsettledPayment[]> {
  if (!(response instanceof Response)) return [];
  try {
    return parseUnsettledPayments(await response.json());
  } catch {
    return [];
  }
}

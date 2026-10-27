import { formatRinggit } from '@/lib/money';

import type { UnpaidSummary } from './types';

const DAY_MS = 86_400_000;

export type BlockedReason =
  | { kind: 'many'; unpaid: UnpaidSummary[]; totalSen: number }
  | { kind: 'old'; payment: UnpaidSummary; days: number };

export function blockedReason(
  owed: UnpaidSummary[],
  now: Date,
  unknownName: string,
): BlockedReason | null {
  if (owed.length === 0) return null;
  const unpaid = owed.map((payment) =>
    payment.payeeName.trim() === '' ? { ...payment, payeeName: unknownName } : payment,
  );
  if (unpaid.length > 1) {
    return {
      kind: 'many',
      unpaid,
      totalSen: unpaid.reduce((sum, payment) => sum + payment.amountSen, 0),
    };
  }
  const [payment] = unpaid;
  const days = Math.floor((now.getTime() - Date.parse(payment.createdAt)) / DAY_MS);
  return { kind: 'old', payment, days };
}

export function ringgit(sen: number, language: string) {
  return formatRinggit(sen, language).replace(/[.,]00$/, '');
}

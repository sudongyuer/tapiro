import type { CurrencyCode, Money } from '@/lib/money';

import { lockedConversion } from './fx';
import { initialSelection, type PayOption } from './payOptions';
import type { FxRate, MethodAmount, Payment } from './types';

export type MethodRow = { option: PayOption; currency: CurrencyCode; amount: Money | null };

export function methodRows(
  options: readonly PayOption[],
  amounts: readonly MethodAmount[],
): MethodRow[] {
  const byId = new Map(amounts.map((entry) => [entry.methodId, entry]));
  return options.flatMap((option) => {
    const entry = byId.get(option.id);
    return entry ? [{ option, currency: entry.currency, amount: entry.amount }] : [];
  });
}

export const blockedCurrency = (row: MethodRow) => (row.amount === null ? row.currency : null);

export type PayerChoice =
  | { kind: 'none' }
  | { kind: 'noCurrency'; currency: CurrencyCode }
  | { kind: 'methods'; rows: MethodRow[]; initial: string | null; converted: boolean };

export function payerChoice(rows: readonly MethodRow[], original: Money): PayerChoice {
  if (rows.length === 0) return { kind: 'none' };
  const payable = rows.flatMap((row) => row.amount ?? []);
  if (payable.length === 0) return { kind: 'noCurrency', currency: original.currency };
  return {
    kind: 'methods',
    rows: [...rows],
    initial: initialSelection(rows.map((row) => row.option)),
    converted: payable.some((amount) => amount.currency !== original.currency),
  };
}

type Settling = Pick<Payment, 'amount' | 'paid'>;

export const paidAmount = (payment: Settling) => payment.paid ?? payment.amount;

export function originalIfConverted(payment: Settling) {
  return paidAmount(payment).currency === payment.amount.currency ? null : payment.amount;
}

export type CelebrationNote =
  { key: 'pay.sheet.original'; amount: Money } | { key: 'pay.celebrate.cny'; amount: Money } | null;

export function celebrationNote(payment: Settling, rate: FxRate | null): CelebrationNote {
  const original = originalIfConverted(payment);
  if (original) return { key: 'pay.sheet.original', amount: original };
  const reference = lockedConversion(paidAmount(payment), rate);
  return reference ? { key: 'pay.celebrate.cny', amount: reference } : null;
}

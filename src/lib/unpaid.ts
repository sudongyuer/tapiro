export type UnpaidInput = {
  state: 'due' | 'marked_paid' | 'settled' | 'disputed';
  nudgedAt: string | null;
  createdAt: string;
};

const HOUR_MS = 3_600_000;
export const BLOCK_AFTER_DAYS = 7;
export const BLOCK_AT_COUNT = 2;
export const REMINDER_HOURS = [24, 72] as const;

export function isUnpaid(payment: UnpaidInput) {
  return payment.state === 'due' || (payment.state === 'marked_paid' && payment.nudgedAt !== null);
}

export function publishBlocked(asPayer: readonly UnpaidInput[], now: Date) {
  const unpaid = asPayer.filter(isUnpaid);
  if (unpaid.length >= BLOCK_AT_COUNT) return true;
  return unpaid.some(
    (payment) => now.getTime() - Date.parse(payment.createdAt) >= BLOCK_AFTER_DAYS * 24 * HOUR_MS,
  );
}

export function reminderDue(payment: UnpaidInput, now: Date, sentHours: readonly number[]) {
  if (payment.state !== 'due') return null;
  const age = now.getTime() - Date.parse(payment.createdAt);
  const due = REMINDER_HOURS.filter(
    (hours) => age >= hours * HOUR_MS && !sentHours.includes(hours),
  );
  return due.length > 0 ? due[due.length - 1] : null;
}

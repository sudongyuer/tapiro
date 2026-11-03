import { addDays, localDayKey } from '@/lib/deviceClock';

export type DayRelation = 'today' | 'tomorrow' | 'other';

export function dayRelation(dayKey: string, now: number): DayRelation {
  const today = localDayKey(now);
  if (dayKey === today) return 'today';
  if (dayKey === addDays(today, 1)) return 'tomorrow';
  return 'other';
}

export function dayKeyDate(dayKey: string) {
  const [year, month, day] = dayKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function minutesUntil(time: number, now: number) {
  return Math.max(0, Math.ceil((time - now) / 60_000));
}

const MALAYSIA_OFFSET_MS = 8 * 3_600_000;
const DAY_MS = 86_400_000;

const local = (time: number) => new Date(time + MALAYSIA_OFFSET_MS);
const pad = (value: number) => String(value).padStart(2, '0');

export function malaysiaDayKey(time: number) {
  const day = local(time);
  return `${day.getUTCFullYear()}-${pad(day.getUTCMonth() + 1)}-${pad(day.getUTCDate())}`;
}

export function malaysiaClock(time: number) {
  const day = local(time);
  return `${pad(day.getUTCHours())}:${pad(day.getUTCMinutes())}`;
}

export type DayRelation = 'today' | 'tomorrow' | 'other';

export function dayRelation(dayKey: string, now: number): DayRelation {
  if (dayKey === malaysiaDayKey(now)) return 'today';
  if (dayKey === malaysiaDayKey(now + DAY_MS)) return 'tomorrow';
  return 'other';
}

export function dayKeyDate(dayKey: string) {
  const [year, month, day] = dayKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function malaysiaTime(dayKey: string, hours: number, minutes: number) {
  return dayKeyDate(dayKey).getTime() + (hours * 60 + minutes) * 60_000 - MALAYSIA_OFFSET_MS;
}

export function minutesUntil(time: number, now: number) {
  return Math.max(0, Math.ceil((time - now) / 60_000));
}

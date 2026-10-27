import type { TimeChoice } from './types';
import { TIME_AHEAD_MS } from './validate';

const STEP_MS = 5 * 60_000;
const HOUR_MS = 3_600_000;

const ahead = (now: Date, ms: number) => Math.ceil((now.getTime() + ms) / STEP_MS) * STEP_MS;
const iso = (time: number) => new Date(time).toISOString();

export function timeBounds(now: Date) {
  return { start: new Date(now), end: new Date(now.getTime() + TIME_AHEAD_MS) };
}

export function addedTime(now: Date): TimeChoice {
  return { kind: 'deadline', deadlineAt: iso(ahead(now, 2 * HOUR_MS)) };
}

export function switchKind(time: TimeChoice, kind: 'deadline' | 'window', now: Date): TimeChoice {
  if (time.kind === kind) return time;
  if (kind === 'deadline') {
    return time.kind === 'window' ? { kind, deadlineAt: time.endsAt } : addedTime(now);
  }
  const start = time.kind === 'deadline' ? Date.parse(time.deadlineAt) : ahead(now, HOUR_MS);
  return { kind, startsAt: iso(start), endsAt: iso(start + HOUR_MS) };
}

export function moveStart(time: Extract<TimeChoice, { kind: 'window' }>, start: Date) {
  const length = Date.parse(time.endsAt) - Date.parse(time.startsAt);
  const end = start.getTime() + (length > 0 ? length : HOUR_MS);
  return { kind: 'window' as const, startsAt: start.toISOString(), endsAt: iso(end) };
}

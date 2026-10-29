const MINUTE_MS = 60_000;
const LEAD_MINUTES = 30;
const STEP_MINUTES = 5;

export function defaultEta(now: Date): Date {
  const step = STEP_MINUTES * MINUTE_MS;
  return new Date(Math.ceil((now.getTime() + LEAD_MINUTES * MINUTE_MS) / step) * step);
}

export function earliestEta(now: Date): Date {
  return new Date(Math.ceil((now.getTime() + 1) / MINUTE_MS) * MINUTE_MS);
}

export const sameMinute = (a: Date, b: string | null) =>
  b !== null &&
  Math.floor(a.getTime() / MINUTE_MS) === Math.floor(new Date(b).getTime() / MINUTE_MS);

const MINUTE = 60_000;

export const GATHER_BEFORE_MS = 30 * MINUTE;
export const NO_SHOW_WINDOW_MS = 15 * MINUTE;
export const EXPIRE_AFTER_MS = 120 * MINUTE;
export const HISTORY_AFTER_MS = 24 * 60 * MINUTE;
export const LATE_MINUTES = [5, 10, 15] as const;

export type RideClock = { departAt: string; revisedAt: string | null };

const at = (iso: string) => Date.parse(iso);

export const departsAt = (ride: RideClock) => at(ride.revisedAt ?? ride.departAt);

export const gathersAt = (ride: RideClock) => departsAt(ride) - GATHER_BEFORE_MS;

export const expiresAt = (ride: RideClock) => departsAt(ride) + EXPIRE_AFTER_MS;

export const isGathering = (ride: RideClock, now: number) =>
  now >= gathersAt(ride) && now < expiresAt(ride);

export const leavingCountsAsNoShow = (ride: RideClock, now: number) =>
  now >= departsAt(ride) - NO_SHOW_WINDOW_MS;

export const isExpired = (ride: RideClock, now: number) => now >= expiresAt(ride);

export const inHistory = (settledAt: string | null, now: number) =>
  settledAt !== null && now - at(settledAt) >= HISTORY_AFTER_MS;

export const lateUntil = (now: number, minutes: (typeof LATE_MINUTES)[number]) =>
  new Date(now + minutes * MINUTE).toISOString();

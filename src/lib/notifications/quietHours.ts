const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const MALAYSIA_OFFSET = 8 * HOUR;
export const QUIET_FROM_HOUR = 23;
export const QUIET_UNTIL_HOUR = 8;

export function outsideQuietHours(at: number) {
  const local = at + MALAYSIA_OFFSET;
  const dayStart = Math.floor(local / DAY) * DAY;
  const hour = (local - dayStart) / HOUR;
  if (hour >= QUIET_FROM_HOUR) return dayStart + DAY + QUIET_UNTIL_HOUR * HOUR - MALAYSIA_OFFSET;
  if (hour < QUIET_UNTIL_HOUR) return dayStart + QUIET_UNTIL_HOUR * HOUR - MALAYSIA_OFFSET;
  return at;
}

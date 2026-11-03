export const QUIET_FROM_HOUR = 23;
export const QUIET_UNTIL_HOUR = 8;

export function outsideQuietHours(at: number) {
  const date = new Date(at);
  const hour = date.getHours();
  if (hour >= QUIET_UNTIL_HOUR && hour < QUIET_FROM_HOUR) return at;
  if (hour >= QUIET_FROM_HOUR) date.setDate(date.getDate() + 1);
  date.setHours(QUIET_UNTIL_HOUR, 0, 0, 0);
  return date.getTime();
}

const MINUTE_MS = 60_000;

// One threshold for every surface: the in-app "late" copy starts when the Live Activity goes stale.
export const ETA_GRACE_MS = 5 * MINUTE_MS;

export type EtaLate = { unit: 'minutes' | 'hours'; count: number };

export function etaLate(etaAt: number, now: number): EtaLate | null {
  const late = now - etaAt;
  if (late < ETA_GRACE_MS) return null;
  const minutes = Math.floor(late / MINUTE_MS);
  return minutes < 60
    ? { unit: 'minutes', count: minutes }
    : { unit: 'hours', count: Math.floor(minutes / 60) };
}

export function etaTextChangesAt(etaAt: number, now: number) {
  const late = now - etaAt;
  if (late < ETA_GRACE_MS) return etaAt + ETA_GRACE_MS;
  return etaAt + (Math.floor(late / MINUTE_MS) + 1) * MINUTE_MS;
}

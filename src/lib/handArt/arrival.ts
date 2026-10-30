const ARRIVAL_TTL_MS = 60_000;

let pending: { bountyId: string; at: number } | null = null;

export function markArrival(bountyId: string, now = Date.now()) {
  pending = { bountyId, at: now };
}

export function takeArrival(bountyId: string, now = Date.now()) {
  if (pending?.bountyId !== bountyId) return false;
  const fresh = now - pending.at < ARRIVAL_TTL_MS;
  pending = null;
  return fresh;
}

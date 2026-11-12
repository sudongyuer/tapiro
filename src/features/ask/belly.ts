export const BELLY_SEGMENTS = 5;

export type Belly = {
  energy: number;
  full: number;
  leaves: number;
  coins: number;
  feedsLeft: number;
  nextRefillAt: string;
};

export type BellyMood = 'full' | 'ok' | 'half' | 'low' | 'hungry';

export type HungryOffer = 'feed' | 'swap' | 'capped' | 'tomorrow';

export type PantryWrite = 'feed' | 'swap' | 'swapFeed';

export type PantryFailure =
  'alreadyFull' | 'fedEnough' | 'noLeaf' | 'noBalance' | 'hasLeaf' | 'failed';

const count = (value: unknown) =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;

export function toBelly(value: unknown): Belly | null {
  if (typeof value !== 'object' || value === null) return null;
  const row = value as Record<string, unknown>;
  const energy = count(row.energy);
  const full = count(row.energyFull);
  const leaves = count(row.leaves);
  const coins = count(row.coins);
  const feedsLeft = count(row.feedsLeft);
  const next = row.nextRefillAt;
  if (energy === null || full === null || full === 0 || energy > full) return null;
  if (leaves === null || coins === null || feedsLeft === null) return null;
  if (typeof next !== 'string' || Number.isNaN(Date.parse(next))) return null;
  return { energy, full, leaves, coins, feedsLeft, nextRefillAt: next };
}

export function withEnergy(belly: Belly, answer: unknown): Belly | null {
  if (typeof answer !== 'object' || answer === null) return null;
  const row = answer as Record<string, unknown>;
  const energy = count(row.energy);
  const full = count(row.energyFull);
  if (energy === null || full === null || full === 0 || energy > full) return null;
  return { ...belly, energy, full };
}

export function bellySegments({ energy, full }: Pick<Belly, 'energy' | 'full'>) {
  if (energy <= 0) return 0;
  return Math.min(BELLY_SEGMENTS, Math.ceil((energy / full) * BELLY_SEGMENTS));
}

export function bellyMood(belly: Pick<Belly, 'energy' | 'full'>): BellyMood {
  const segments = bellySegments(belly);
  if (segments === 0) return 'hungry';
  if (segments === 1) return 'low';
  if (segments === 2) return 'half';
  return segments === BELLY_SEGMENTS ? 'full' : 'ok';
}

export function hungryOffer(belly: Belly): HungryOffer {
  if (belly.feedsLeft <= 0) return 'capped';
  if (belly.leaves > 0) return 'feed';
  return belly.coins > 0 ? 'swap' : 'tomorrow';
}

export const isHungry = (belly: Belly | null | undefined) => !!belly && belly.energy <= 0;

const FAILURES: Record<string, PantryFailure> = {
  already_full: 'alreadyFull',
  fed_enough: 'fedEnough',
  no_leaf: 'noLeaf',
  no_balance: 'noBalance',
  has_leaf: 'hasLeaf',
};

export function toPantryFailure(error: unknown): PantryFailure {
  const message = (error as { message?: unknown } | null)?.message;
  return (typeof message === 'string' && FAILURES[message]) || 'failed';
}

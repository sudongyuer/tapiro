import type { Belly, PantryWrite } from './belly';
import type { AskService, ConsentStatus, PantryResult } from './consent';

export type FixtureConsent = 'none' | 'given' | 'newer' | 'bumped';
export type FixtureFailPoint = 'load' | 'loadAgain' | 'record' | 'withdraw' | 'pantry';

const FAIL_POINTS: readonly FixtureFailPoint[] = [
  'load',
  'loadAgain',
  'record',
  'withdraw',
  'pantry',
];
export const FIXTURE_ACCEPTED_AT = '2026-10-31T09:30:00.000Z';
export const FIXTURE_FULL = 1000;
export const FIXTURE_CALL_COST = 334;

// `energy,leaves,coins,feedsLeft`, for example `0,2,5,5`: an empty belly with two leaves in the jar.
export function fixtureBelly(value: string | undefined, now = new Date()): Belly {
  const [energy, leaves, coins, feedsLeft] = (value ?? '').split(',').map((part) => Number(part));
  const whole = (part: number | undefined, fallback: number) =>
    Number.isInteger(part) && (part as number) >= 0 ? (part as number) : fallback;
  const next = new Date(now);
  next.setUTCHours(22, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return {
    energy: Math.min(FIXTURE_FULL, whole(energy, FIXTURE_FULL)),
    full: FIXTURE_FULL,
    leaves: whole(leaves, 0),
    coins: whole(coins, 0),
    feedsLeft: whole(feedsLeft, 5),
    nextRefillAt: next.toISOString(),
  };
}

function pantryRefusal(belly: Belly, kind: PantryWrite): PantryResult | null {
  if (kind !== 'swap' && belly.energy >= belly.full) return { ok: false, failure: 'alreadyFull' };
  if (kind !== 'swap' && belly.feedsLeft <= 0) return { ok: false, failure: 'fedEnough' };
  if (kind === 'feed' && belly.leaves < 1) return { ok: false, failure: 'noLeaf' };
  if (kind === 'swapFeed' && belly.leaves > 0) return { ok: false, failure: 'hasLeaf' };
  if (kind !== 'feed' && belly.coins < 1) return { ok: false, failure: 'noBalance' };
  return null;
}

function afterPantry(belly: Belly, kind: PantryWrite): Belly {
  const coins = kind === 'feed' ? belly.coins : belly.coins - 1;
  const leaves =
    kind === 'swap' ? belly.leaves + 1 : kind === 'feed' ? belly.leaves - 1 : belly.leaves;
  if (kind === 'swap') return { ...belly, coins, leaves };
  return { ...belly, coins, leaves, energy: belly.full, feedsLeft: belly.feedsLeft - 1 };
}

export const fixtureConsent = (value: string | undefined): FixtureConsent =>
  value === 'given' || value === 'newer' || value === 'bumped' ? value : 'none';

export const fixtureFailPoints = (value: string | undefined) =>
  new Set(
    (value ?? '')
      .split(',')
      .filter((point): point is FixtureFailPoint =>
        FAIL_POINTS.includes(point as FixtureFailPoint),
      ),
  );

export type FixtureAskService = AskService & {
  withdrawElsewhere(): void;
  spend(): { energy: number; energyFull: number } | null;
};

export function createFixtureAskService({
  consent,
  belly,
  failFirst,
  delayMs,
  onCall,
}: {
  consent: FixtureConsent;
  belly: Belly;
  failFirst: Set<FixtureFailPoint>;
  delayMs: number;
  onCall: (name: string, args: unknown) => void;
}): FixtureAskService {
  let status: ConsentStatus = {
    currentVersion: consent === 'newer' ? 2 : 1,
    given: consent === 'given',
    acceptedAt: consent === 'given' ? FIXTURE_ACCEPTED_AT : null,
    belly,
  };
  let loads = 0;
  const wait = () => new Promise((resolve) => setTimeout(resolve, delayMs));
  const failsOnce = (point: FixtureFailPoint) => failFirst.delete(point);

  return {
    async status() {
      loads += 1;
      onCall('status', null);
      await wait();
      if (failsOnce(loads === 1 ? 'load' : 'loadAgain')) throw new Error('fixture: offline');
      return status;
    },
    async recordConsent(version) {
      onCall('record', { version });
      await wait();
      if (failsOnce('record')) return { ok: false, failure: 'failed' };
      if (consent === 'bumped') status = { ...status, currentVersion: 2 };
      if (version !== status.currentVersion) return { ok: false, failure: 'needsUpdate' };
      if (!status.given) status = { ...status, given: true, acceptedAt: new Date().toISOString() };
      return { ok: true, status };
    },
    withdrawElsewhere() {
      status = { ...status, given: false, acceptedAt: null };
    },
    spend() {
      const current = status.belly;
      if (!current || current.energy <= 0) return null;
      const energy = Math.max(0, current.energy - FIXTURE_CALL_COST);
      status = { ...status, belly: { ...current, energy } };
      return { energy, energyFull: current.full };
    },
    async pantry(kind) {
      onCall('pantry', { kind });
      await wait();
      if (failsOnce('pantry')) return { ok: false, failure: 'failed' };
      const current = status.belly!;
      const refused = pantryRefusal(current, kind);
      if (refused) return refused;
      status = { ...status, belly: afterPantry(current, kind) };
      return { ok: true, status };
    },
    async withdrawConsent() {
      onCall('withdraw', null);
      await wait();
      if (failsOnce('withdraw')) return { ok: false, failure: 'failed' };
      status = { ...status, given: false, acceptedAt: null };
      return { ok: true, status };
    },
  };
}

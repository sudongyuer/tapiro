import type { AskService, ConsentStatus } from './consent';

export type FixtureConsent = 'none' | 'given' | 'newer' | 'bumped';
export type FixtureFailPoint = 'load' | 'loadAgain' | 'record' | 'withdraw';

const FAIL_POINTS: readonly FixtureFailPoint[] = ['load', 'loadAgain', 'record', 'withdraw'];
export const FIXTURE_ACCEPTED_AT = '2026-10-31T09:30:00.000Z';

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

export function createFixtureAskService({
  consent,
  failFirst,
  delayMs,
  onCall,
}: {
  consent: FixtureConsent;
  failFirst: Set<FixtureFailPoint>;
  delayMs: number;
  onCall: (name: string, args: unknown) => void;
}): AskService & { withdrawElsewhere(): void } {
  let status: ConsentStatus = {
    currentVersion: consent === 'newer' ? 2 : 1,
    given: consent === 'given',
    acceptedAt: consent === 'given' ? FIXTURE_ACCEPTED_AT : null,
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
    async withdrawConsent() {
      onCall('withdraw', null);
      await wait();
      if (failsOnce('withdraw')) return { ok: false, failure: 'failed' };
      status = { ...status, given: false, acceptedAt: null };
      return { ok: true, status };
    },
  };
}

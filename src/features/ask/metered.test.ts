import { describe, expect, test } from 'bun:test';

import { loaded, type Loadable } from '@/lib/loadable';

import type { Belly } from './belly';
import type { CloudAnswer } from './cloudGate';
import type { ConsentStatus } from './consent';
import { metered } from './metered';

const BELLY: Belly = {
  energy: 600,
  full: 1000,
  leaves: 0,
  coins: 0,
  feedsLeft: 5,
  nextRefillAt: '2026-11-12T22:00:00.000Z',
};

function harness(answer: CloudAnswer, belly: Belly | null = BELLY) {
  const applied: [string, Belly][] = [];
  let refreshes = 0;
  const store = {
    userId: 'u1' as string | null,
    status: loaded<ConsentStatus>({
      currentVersion: 1,
      given: true,
      acceptedAt: '2026-11-12T03:00:00.000Z',
      belly,
    }) as Loadable<ConsentStatus>,
    getSnapshot: () => ({ userId: store.userId, status: store.status }),
    applyBelly: (userId: string, next: Belly) => applied.push([userId, next]),
    refresh: async () => {
      refreshes += 1;
    },
  };
  let release!: () => void;
  const send = metered(
    store,
    () =>
      new Promise<CloudAnswer>((resolve) => {
        release = () => resolve(answer);
      }),
  );
  const call = () => {
    const pending = send({ task: 'ask', input: { text: 'hi' } });
    return { pending, release: () => release() };
  };
  return { call, applied, store, refreshes: () => refreshes };
}

describe('metered', () => {
  test('an answer moves the bar to the energy it reports, with no second read', async () => {
    const { call, applied, refreshes } = harness({
      ok: true,
      body: { tool: 'answer', energy: 266, energyFull: 1000 },
    });
    const { pending, release } = call();
    release();
    await pending;
    expect(applied).toEqual([['u1', { ...BELLY, energy: 266 }]]);
    expect(refreshes()).toBe(0);
  });

  test('an answer without a readable energy rereads instead of guessing', async () => {
    const { call, applied, refreshes } = harness({ ok: true, body: { tool: 'answer' } });
    const { pending, release } = call();
    release();
    await pending;
    expect(applied).toEqual([]);
    expect(refreshes()).toBe(1);
  });

  test('a hungry refusal rereads what the hungry card can offer', async () => {
    const { call, refreshes } = harness({ ok: false, error: 'hungry', status: 429 });
    const { pending, release } = call();
    release();
    await pending;
    expect(refreshes()).toBe(1);
  });

  test('other failures leave the belly alone (nothing was charged)', async () => {
    const { call, applied, refreshes } = harness({
      ok: false,
      error: 'provider_error',
      status: 502,
    });
    const { pending, release } = call();
    release();
    await pending;
    expect(applied).toEqual([]);
    expect(refreshes()).toBe(0);
  });

  test('an answer landing after sign-out touches nothing', async () => {
    const { call, applied, store, refreshes } = harness({
      ok: true,
      body: { energy: 1, energyFull: 1000 },
    });
    const { pending, release } = call();
    store.userId = 'u2';
    release();
    await pending;
    expect(applied).toEqual([]);
    expect(refreshes()).toBe(0);
  });
});

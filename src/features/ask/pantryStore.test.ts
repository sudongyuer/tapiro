import { describe, expect, test } from 'bun:test';

import type { Belly, PantryWrite } from './belly';
import type { PantryResult } from './consent';
import { createPantryStore } from './pantryStore';

const BELLY: Belly = {
  energy: 1000,
  full: 1000,
  leaves: 1,
  coins: 3,
  feedsLeft: 4,
  nextRefillAt: '2026-11-12T22:00:00.000Z',
};

function harness() {
  const writes: { kind: PantryWrite; resolve: (result: PantryResult | null) => void }[] = [];
  const applied: [string, Belly][] = [];
  let refreshes = 0;
  const status = {
    userId: 'u1' as string | null,
    getSnapshot: () => ({ userId: status.userId }),
    applyBelly: (userId: string, belly: Belly) => applied.push([userId, belly]),
    reread: async () => {
      refreshes += 1;
    },
  };
  const store = createPantryStore({
    service: {
      pantry: (kind) =>
        new Promise<PantryResult>((resolve, reject) =>
          writes.push({
            kind,
            resolve: (result) => (result ? resolve(result) : reject(new Error('offline'))),
          }),
        ),
    },
    status,
  });
  const ok = (belly: Belly): PantryResult => ({
    ok: true,
    status: { currentVersion: 1, given: true, acceptedAt: null, belly },
  });
  return { store, writes, applied, status, ok, refreshes: () => refreshes };
}

describe('pantry store', () => {
  test('a feed shows progress, applies the new belly and counts a feed for the motion', async () => {
    const { store, writes, applied, ok } = harness();
    const done = store.feed();
    expect(store.getSnapshot().writing).toBe('feed');
    writes[0].resolve(ok(BELLY));
    expect(await done).toBe(true);
    expect(writes[0].kind).toBe('feed');
    expect(applied).toEqual([['u1', BELLY]]);
    expect(store.getSnapshot()).toEqual({ writing: null, failure: null, fed: 1 });
  });

  test('a swap into the jar is not a feed', async () => {
    const { store, writes, ok } = harness();
    const done = store.swap();
    writes[0].resolve(ok({ ...BELLY, leaves: 2, coins: 2 }));
    expect(await done).toBe(true);
    expect(store.getSnapshot().fed).toBe(0);
  });

  test('a second tap while one write is out sends nothing', async () => {
    const { store, writes } = harness();
    void store.swapAndFeed();
    expect(await store.feed()).toBe(false);
    expect(writes.map((write) => write.kind)).toEqual(['swapFeed']);
  });

  test('a refusal keeps its reason, rereads the status and is not retried', async () => {
    const { store, writes, applied, refreshes } = harness();
    const done = store.feed();
    writes[0].resolve({ ok: false, failure: 'fedEnough' });
    expect(await done).toBe(false);
    expect(store.getSnapshot().failure).toEqual({ write: 'feed', reason: 'fedEnough' });
    expect(applied).toEqual([]);
    expect(refreshes()).toBe(1);
    expect(writes).toHaveLength(1);
  });

  test('a lost answer is a plain failure that rereads, since the coin may have moved', async () => {
    const { store, writes, refreshes } = harness();
    const done = store.swap();
    writes[0].resolve(null);
    expect(await done).toBe(false);
    expect(store.getSnapshot().failure).toEqual({ write: 'swap', reason: 'failed' });
    expect(refreshes()).toBe(1);
  });

  test('an answer landing after sign-out is dropped', async () => {
    const { store, writes, applied, status, ok } = harness();
    const done = store.feed();
    status.userId = 'u2';
    writes[0].resolve(ok(BELLY));
    expect(await done).toBe(false);
    expect(applied).toEqual([]);
  });

  test('clearing drops a write still out', async () => {
    const { store, writes, applied, ok } = harness();
    const done = store.feed();
    store.clear();
    writes[0].resolve(ok(BELLY));
    expect(await done).toBe(false);
    expect(applied).toEqual([]);
    expect(store.getSnapshot()).toEqual({ writing: null, failure: null, fed: 0 });
  });
});

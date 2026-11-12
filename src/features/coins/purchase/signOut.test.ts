import { describe, expect, test } from 'bun:test';

import { createSessionEnds } from '@/lib/sessionEnds';

import { createFixtureStore } from './fixtureStore';
import { createPurchaseStore } from './purchaseStore';
import type { StoreBoundary } from './types';

const USER = '0a1b2c3d-0000-4000-8000-000000000001';

function harness() {
  let scans = 0;
  const base = createFixtureStore({ mode: 'ok', userId: () => USER });
  const store: StoreBoundary = {
    ...base,
    unfinished: async () => {
      scans += 1;
      return base.unfinished();
    },
  };
  const purchases = createPurchaseStore({
    store,
    packs: async () => [],
    verify: async () => ({ ok: true, status: 'credited', balance: 0, coins: 0 }),
    onCoinsChanged: () => undefined,
  });
  return { purchases, scans: () => scans };
}

describe('sign-out without a render that has no user', () => {
  const tab = (h: ReturnType<typeof harness>) => (userId: string | null) => {
    if (!userId) {
      h.purchases.clear();
      return () => undefined;
    }
    void h.purchases.start(userId);
    return () => undefined;
  };

  test('without a session end, the same user signing back in skips the scan', async () => {
    const h = harness();
    const unmount = tab(h)(USER);
    await Promise.resolve();
    unmount();
    tab(h)(USER);
    await Promise.resolve();
    expect(h.scans()).toBe(1);
  });

  test('the session end clears the store, so the same user signing back in scans again', async () => {
    const h = harness();
    const ends = createSessionEnds();
    ends.register(() => h.purchases.clear());
    ends.observe(USER);
    const unmount = tab(h)(USER);
    await Promise.resolve();
    ends.observe(null);
    unmount();
    expect(h.purchases.getSnapshot().userId).toBeNull();
    ends.observe(USER);
    tab(h)(USER);
    await Promise.resolve();
    expect(h.scans()).toBe(2);
  });
});

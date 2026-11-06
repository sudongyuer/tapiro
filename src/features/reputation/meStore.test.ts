import { describe, expect, test } from 'bun:test';

import { createMeStore, shownTierDrop } from './meStore';
import { AccessoryError } from './reputationService';
import { fakeService, mascot, ME, settle } from './storeHarness';
import type { TierDrop } from './types';

const DROP: TierDrop = {
  id: 3,
  from: 'very_reliable',
  to: 'reliable',
  droppedAt: '2026-11-06T19:30:00Z',
  noShows: [],
  noShowCount: 1,
  negativeReviews: 0,
  settled: 8,
  people: 4,
  toRegain: { tier: 'very_reliable', settled: 2, newPeople: 1, goodReviews: 0 },
};

function setup(overrides: Parameters<typeof fakeService>[0] = {}) {
  const store = createMeStore({ service: fakeService(overrides) });
  store.start(ME);
  return store;
}

describe('tier drop', () => {
  test('a pending drop is shown once and hidden after it is dismissed, even if the mark fails', async () => {
    const store = setup({
      pendingTierDrop: async () => DROP,
      markTierDropSeen: () => Promise.reject(new Error('x')),
    });
    store.loadTierDrop();
    await settle();
    expect(shownTierDrop(store.getSnapshot())).toEqual(DROP);
    expect(await store.dismissTierDrop(3)).toBe(false);
    expect(shownTierDrop(store.getSnapshot())).toBeNull();
  });

  test('a failed or stale read shows no drop', async () => {
    let fail = true;
    const store = setup({
      pendingTierDrop: () => (fail ? Promise.reject(new Error('x')) : Promise.resolve(DROP)),
    });
    store.loadTierDrop();
    await settle();
    expect(store.getSnapshot().tierDrop.status).toBe('failed');
    expect(shownTierDrop(store.getSnapshot())).toBeNull();
    fail = false;
    await store.reloadTierDrop();
    fail = true;
    await store.reloadTierDrop();
    expect(store.getSnapshot().tierDrop.status).toBe('stale');
    expect(shownTierDrop(store.getSnapshot())).toBeNull();
  });
});

describe('mascot', () => {
  test('marking the level seen replaces the mascot with the server answer', async () => {
    const store = setup({
      myMascot: async () => mascot(),
      markLevelSeen: async () => mascot({ seenLevel: 2, levelUp: false }),
    });
    store.loadMascot();
    await settle();
    expect(await store.markLevelSeen(2)).toBe(true);
    const shown = store.getSnapshot().mascot;
    expect(shown.status !== 'idle' && shown.data?.levelUp).toBe(false);
  });

  test('a locked accessory fails with its reason and reloads; a lost answer fails as failed', async () => {
    let reads = 0;
    let answer: Error = new AccessoryError('locked');
    const store = setup({
      myMascot: async () => {
        reads += 1;
        return mascot();
      },
      setAccessory: () => Promise.reject(answer),
    });
    store.loadMascot();
    await settle();
    expect(await store.setAccessory('scarf')).toBe(false);
    expect(store.getSnapshot().accessory).toEqual({
      phase: 'failed',
      accessory: 'scarf',
      failure: 'locked',
    });
    await settle();
    expect(reads).toBe(2);
    answer = new Error('offline');
    expect(await store.setAccessory('red_hat')).toBe(false);
    expect(store.getSnapshot().accessory).toEqual({
      phase: 'failed',
      accessory: 'red_hat',
      failure: 'failed',
    });
  });

  test('a failed accessory write does not drop a mascot read in flight', async () => {
    let reads = 0;
    let release: (value: ReturnType<typeof mascot>) => void = () => undefined;
    const store = setup({
      myMascot: () => {
        reads += 1;
        if (reads === 1) return Promise.resolve(mascot());
        return new Promise((resolve) => {
          release = resolve;
        });
      },
      setAccessory: () => Promise.reject(new Error('offline')),
    });
    store.loadMascot();
    await settle();
    store.onStickers();
    await store.setAccessory('red_hat');
    release(mascot({ level: 3, stickers: 8 }));
    await settle();
    const shown = store.getSnapshot().mascot;
    expect(shown.status !== 'idle' && shown.data?.level).toBe(3);
  });

  test('an older mascot write answering last does not win', async () => {
    const answers: ((value: ReturnType<typeof mascot>) => void)[] = [];
    const store = setup({
      myMascot: async () => mascot(),
      markLevelSeen: () => new Promise((resolve) => answers.push(resolve)),
      setAccessory: () => new Promise((resolve) => answers.push(resolve)),
    });
    store.loadMascot();
    await settle();
    const first = store.markLevelSeen(2);
    const second = store.setAccessory('red_hat');
    answers[1](mascot({ chosenAccessory: 'red_hat', seenLevel: 2, levelUp: false }));
    await second;
    answers[0](mascot({ seenLevel: 2, levelUp: false }));
    await first;
    const shown = store.getSnapshot().mascot;
    expect(shown.status !== 'idle' && shown.data?.chosenAccessory).toBe('red_hat');
  });

  test('new stickers reload a loaded mascot and leave an unloaded one alone', async () => {
    let reads = 0;
    const store = setup({
      myMascot: async () => {
        reads += 1;
        return mascot();
      },
    });
    store.onStickers();
    await settle();
    expect(reads).toBe(0);
    store.loadMascot();
    await settle();
    store.onStickers();
    await settle();
    expect(reads).toBe(2);
  });
});

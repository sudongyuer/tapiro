import { describe, expect, test } from 'bun:test';

import { createOnboardingStore, memoryOnboardedStorage } from './onboardingStore';

describe('onboarding store', () => {
  test('restores, marks and clears users and persists every change', () => {
    const storage = memoryOnboardedStorage(['a']);
    const store = createOnboardingStore(storage);
    let notified = 0;
    store.subscribe(() => notified++);

    expect(store.getSnapshot().has('a')).toBe(true);
    store.markDone('b');
    expect(storage.read().sort()).toEqual(['a', 'b']);
    store.clear('a');
    expect(storage.read()).toEqual(['b']);
    expect(notified).toBe(2);
  });

  test('returns a new snapshot only when something changes', () => {
    const store = createOnboardingStore(memoryOnboardedStorage());
    const before = store.getSnapshot();
    store.clear('missing');
    expect(store.getSnapshot()).toBe(before);
    store.markDone('a');
    const after = store.getSnapshot();
    expect(after).not.toBe(before);
    store.markDone('a');
    expect(store.getSnapshot()).toBe(after);
  });
});

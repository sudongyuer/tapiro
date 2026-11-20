import { describe, expect, test } from 'bun:test';

import { createStorefront, type StorefrontSource } from './controller';
import { aiOffered, storefrontCode, storefrontHeader } from './region';

function fakeSource(answer: () => Promise<string | null>) {
  let listener: ((code: string) => void) | null = null;
  let removed = false;
  const source: StorefrontSource = {
    countryCode: answer,
    listen(cb) {
      listener = cb;
      return {
        remove() {
          removed = true;
        },
      };
    },
  };
  return {
    source,
    emit: (code: string) => listener?.(code),
    removed: () => removed,
  };
}

function fakeCache(initial: unknown = null) {
  const writes: string[] = [];
  return {
    cache: { read: () => initial, write: (code: string) => void writes.push(code) },
    writes,
  };
}

describe('aiOffered', () => {
  test('the China mainland storefront never offers AI', () => {
    expect(aiOffered({ countryCode: 'CHN', resolved: true })).toBe(false);
    expect(aiOffered({ countryCode: 'CHN', resolved: false })).toBe(false);
  });

  test('another storefront offers AI', () => {
    expect(aiOffered({ countryCode: 'MYS', resolved: true })).toBe(true);
    expect(aiOffered({ countryCode: 'MYS', resolved: false })).toBe(true);
  });

  test('an install with no storefront yet stays closed until StoreKit answers', () => {
    expect(aiOffered({ countryCode: null, resolved: false })).toBe(false);
    expect(aiOffered({ countryCode: null, resolved: true })).toBe(true);
  });
});

describe('storefront codes', () => {
  test('only three-letter codes count, upper-cased', () => {
    expect(storefrontCode('chn')).toBe('CHN');
    expect(storefrontCode('CN')).toBeNull();
    expect(storefrontCode(42)).toBeNull();
    expect(storefrontCode('')).toBeNull();
  });

  test('the header says unknown when there is no storefront', () => {
    expect(storefrontHeader({ countryCode: null, resolved: true })).toBe('unknown');
    expect(storefrontHeader({ countryCode: 'CHN', resolved: true })).toBe('CHN');
  });
});

describe('createStorefront', () => {
  test('a cached China storefront closes AI before StoreKit answers', () => {
    const { source } = fakeSource(() => new Promise(() => {}));
    const store = createStorefront({ source, cache: fakeCache('CHN').cache, timeoutMs: 1000 });
    expect(aiOffered(store.get())).toBe(false);
  });

  test('a StoreKit answer replaces the cache and is saved', async () => {
    const { source } = fakeSource(async () => 'MYS');
    const { cache, writes } = fakeCache('CHN');
    const store = createStorefront({ source, cache, timeoutMs: 1000 });
    await store.refresh();
    expect(store.get()).toEqual({ countryCode: 'MYS', resolved: true });
    expect(writes).toEqual(['MYS']);
  });

  test('no StoreKit storefront keeps the cached one', async () => {
    const { source } = fakeSource(async () => null);
    const store = createStorefront({ source, cache: fakeCache('CHN').cache, timeoutMs: 1000 });
    await store.refresh();
    expect(store.get()).toEqual({ countryCode: 'CHN', resolved: true });
    expect(aiOffered(store.get())).toBe(false);
  });

  test('a StoreKit call that never answers resolves as unknown after the timeout', async () => {
    const { source } = fakeSource(() => new Promise(() => {}));
    const store = createStorefront({ source, cache: fakeCache().cache, timeoutMs: 5 });
    await store.refresh();
    expect(store.get()).toEqual({ countryCode: null, resolved: true });
  });

  test('a failed StoreKit call resolves as unknown', async () => {
    const { source } = fakeSource(() => Promise.reject(new Error('boom')));
    const store = createStorefront({ source, cache: fakeCache().cache, timeoutMs: 1000 });
    await store.refresh();
    expect(store.get().resolved).toBe(true);
  });

  test('a storefront change while running closes AI and notifies, and unfollowing stops listening', async () => {
    const fake = fakeSource(async () => 'MYS');
    const { cache, writes } = fakeCache();
    const store = createStorefront({ source: fake.source, cache, timeoutMs: 1000 });
    const seen: boolean[] = [];
    store.subscribe(() => seen.push(aiOffered(store.get())));
    const stop = store.follow();
    await Bun.sleep(0);
    fake.emit('CHN');
    expect(seen).toEqual([true, false]);
    expect(writes).toEqual(['MYS', 'CHN']);
    stop();
    expect(fake.removed()).toBe(true);
  });
});

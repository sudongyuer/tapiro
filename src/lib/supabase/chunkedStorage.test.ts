import { describe, expect, test } from 'bun:test';

import { createChunkedStorage, utf8Length, type KeyValueStore } from './chunkedStorage';

function memoryStore(limit: number) {
  const items = new Map<string, string>();
  const store: KeyValueStore = {
    getItemAsync: async (key) => items.get(key) ?? null,
    setItemAsync: async (key, value) => {
      if (!/^[\w.-]+$/.test(key)) throw new Error(`invalid key ${key}`);
      if (utf8Length(value) > limit) throw new Error(`value over ${limit} bytes`);
      items.set(key, value);
    },
    deleteItemAsync: async (key) => {
      items.delete(key);
    },
  };
  return { store, items };
}

const session = JSON.stringify({
  access_token: 'a'.repeat(1200),
  refresh_token: 'r'.repeat(40),
  user: {
    id: 'u1',
    user_metadata: { full_name: '林小貘 🦛', avatar_url: 'https://x/' + 'p'.repeat(900) },
  },
});

describe('chunked storage', () => {
  test('round-trips a value larger than one keychain item', async () => {
    const { store, items } = memoryStore(2048);
    const storage = createChunkedStorage(store, { chunkBytes: 500 });
    await storage.setItem('tapiro.auth', session);
    expect(await storage.getItem('tapiro.auth')).toBe(session);
    expect(items.size).toBeGreaterThan(2);
    for (const value of items.values()) expect(utf8Length(value)).toBeLessThanOrEqual(500);
  });

  test('never splits a multi-byte character across chunks', async () => {
    const { store } = memoryStore(2048);
    const storage = createChunkedStorage(store, { chunkBytes: 5 });
    const value = '貘🦛貘🦛a貘';
    await storage.setItem('k', value);
    expect(await storage.getItem('k')).toBe(value);
  });

  test('returns null for a missing key', async () => {
    const { store } = memoryStore(2048);
    expect(await createChunkedStorage(store).getItem('absent')).toBeNull();
  });

  test('returns null instead of a partial value when a chunk is missing', async () => {
    const { store, items } = memoryStore(2048);
    const storage = createChunkedStorage(store, { chunkBytes: 100 });
    await storage.setItem('k', session);
    const chunkKey = [...items.keys()].find((key) => key.startsWith('k.'));
    items.delete(chunkKey!);
    expect(await storage.getItem('k')).toBeNull();
  });

  test('returns null for a corrupt manifest', async () => {
    const { store, items } = memoryStore(2048);
    items.set('k', 'not json');
    expect(await createChunkedStorage(store).getItem('k')).toBeNull();
  });

  test('overwriting removes the previous chunks', async () => {
    const { store, items } = memoryStore(2048);
    const storage = createChunkedStorage(store, { chunkBytes: 100 });
    await storage.setItem('k', session);
    await storage.setItem('k', 'short');
    expect(await storage.getItem('k')).toBe('short');
    expect(items.size).toBe(2);
  });

  test('removeItem deletes the manifest and every chunk', async () => {
    const { store, items } = memoryStore(2048);
    const storage = createChunkedStorage(store, { chunkBytes: 100 });
    await storage.setItem('k', session);
    await storage.removeItem('k');
    expect(items.size).toBe(0);
    expect(await storage.getItem('k')).toBeNull();
  });

  test('serializes interleaved operations on the same key', async () => {
    const { store } = memoryStore(2048);
    const tick = () => new Promise((resolve) => setTimeout(resolve, Math.random() * 3));
    const slow: KeyValueStore = {
      getItemAsync: async (key) => (await tick(), store.getItemAsync(key)),
      setItemAsync: async (key, value) => (await tick(), store.setItemAsync(key, value)),
      deleteItemAsync: async (key) => (await tick(), store.deleteItemAsync(key)),
    };
    const storage = createChunkedStorage(slow, { chunkBytes: 100 });
    const second = session.replace('u1', 'u2');
    const results = await Promise.all([
      storage.setItem('k', session),
      storage.getItem('k'),
      storage.setItem('k', second),
      storage.getItem('k'),
      storage.removeItem('k'),
      storage.getItem('k'),
    ]);
    expect(results).toEqual([undefined, session, undefined, second, undefined, null]);
  });

  test('stores an empty string', async () => {
    const { store } = memoryStore(2048);
    const storage = createChunkedStorage(store);
    await storage.setItem('k', '');
    expect(await storage.getItem('k')).toBe('');
  });
});

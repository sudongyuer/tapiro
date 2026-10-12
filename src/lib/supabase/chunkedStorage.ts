export type KeyValueStore = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};

export type ChunkedStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

type Manifest = { id: string; count: number };

const DEFAULT_CHUNK_BYTES = 1800;

export function utf8Length(value: string) {
  let bytes = 0;
  for (const char of value) bytes += codePointBytes(char.codePointAt(0)!);
  return bytes;
}

function codePointBytes(codePoint: number) {
  if (codePoint < 0x80) return 1;
  if (codePoint < 0x800) return 2;
  if (codePoint < 0x10000) return 3;
  return 4;
}

export function splitUtf8(value: string, maxBytes: number) {
  const chunks: string[] = [];
  let current = '';
  let currentBytes = 0;
  for (const char of value) {
    const bytes = codePointBytes(char.codePointAt(0)!);
    if (currentBytes + bytes > maxBytes) {
      chunks.push(current);
      current = '';
      currentBytes = 0;
    }
    current += char;
    currentBytes += bytes;
  }
  if (current) chunks.push(current);
  return chunks;
}

function parseManifest(raw: string | null): Manifest | null {
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'id' in parsed &&
      'count' in parsed &&
      typeof parsed.id === 'string' &&
      typeof parsed.count === 'number' &&
      Number.isInteger(parsed.count) &&
      parsed.count >= 0
    ) {
      return { id: parsed.id, count: parsed.count };
    }
  } catch {}
  return null;
}

function chunkKey(key: string, manifest: Manifest, index: number) {
  return `${key}.${manifest.id}.${index}`;
}

function newGenerationId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function createChunkedStorage(
  store: KeyValueStore,
  { chunkBytes = DEFAULT_CHUNK_BYTES, newId = newGenerationId } = {},
): ChunkedStorage {
  const pending = new Map<string, Promise<unknown>>();

  function serialized<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const result = (pending.get(key) ?? Promise.resolve()).then(operation, operation);
    const tail = result.catch(() => {});
    pending.set(key, tail);
    tail.then(() => {
      if (pending.get(key) === tail) pending.delete(key);
    });
    return result;
  }

  async function deleteChunks(key: string, manifest: Manifest) {
    for (let index = 0; index < manifest.count; index++) {
      await store.deleteItemAsync(chunkKey(key, manifest, index));
    }
  }

  async function readItem(key: string) {
    const manifest = parseManifest(await store.getItemAsync(key));
    if (!manifest) return null;
    let value = '';
    for (let index = 0; index < manifest.count; index++) {
      const chunk = await store.getItemAsync(chunkKey(key, manifest, index));
      if (chunk === null) return null;
      value += chunk;
    }
    return value;
  }

  async function writeItem(key: string, value: string) {
    const previous = parseManifest(await store.getItemAsync(key));
    const chunks = splitUtf8(value, chunkBytes);
    const manifest: Manifest = { id: newId(), count: chunks.length };
    for (const [index, chunk] of chunks.entries()) {
      await store.setItemAsync(chunkKey(key, manifest, index), chunk);
    }
    await store.setItemAsync(key, JSON.stringify(manifest));
    if (previous) await deleteChunks(key, previous);
  }

  async function deleteItem(key: string) {
    const manifest = parseManifest(await store.getItemAsync(key));
    await store.deleteItemAsync(key);
    if (manifest) await deleteChunks(key, manifest);
  }

  return {
    getItem: (key) => serialized(key, () => readItem(key)),
    setItem: (key, value) => serialized(key, () => writeItem(key, value)),
    removeItem: (key) => serialized(key, () => deleteItem(key)),
  };
}

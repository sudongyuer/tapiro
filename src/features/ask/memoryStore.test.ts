import { describe, expect, test } from 'bun:test';

import type { MemoryEntry, MemoryList, MemoryResult, MemoryService } from './memory';
import { createMemoryStore } from './memoryStore';

const AT = '2026-11-14T09:00:00.000Z';
const DORM: MemoryEntry = {
  id: 'e1',
  kind: 'place',
  label: '宿舍',
  content: 'Sunway Geo',
  updatedAt: AT,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function harness() {
  const lists: ReturnType<typeof deferred<MemoryList>>[] = [];
  const writes: ReturnType<typeof deferred<MemoryResult<unknown>>>[] = [];
  const write = <T>() => {
    const next = deferred<MemoryResult<unknown>>();
    writes.push(next);
    return next.promise as Promise<MemoryResult<T>>;
  };
  const service: MemoryService = {
    list: () => {
      const next = deferred<MemoryList>();
      lists.push(next);
      return next.promise;
    },
    save: () => write(),
    remove: () => write(),
    clear: () => write(),
    setEnabled: () => write(),
  };
  return { store: createMemoryStore(service), lists, writes };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('the 小貘记得 store', () => {
  test('a failed load is never shown as an empty list', async () => {
    const { store, lists } = harness();
    void store.start('u1');
    lists[0].reject(new Error('offline'));
    await settle();
    expect(store.getSnapshot().status).toBe('failed');
    expect(store.getSnapshot().data).toBeNull();
  });

  test('a failed refresh keeps the list and marks it stale', async () => {
    const { store, lists } = harness();
    void store.start('u1');
    lists[0].resolve({ enabled: true, entries: [DORM] });
    await settle();
    void store.refresh();
    lists[1].reject(new Error('offline'));
    await settle();
    expect(store.getSnapshot().status).toBe('stale');
    expect(store.getSnapshot().data?.entries).toEqual([DORM]);
  });

  test('a delete hides the row only while it is under way and brings it back on failure', async () => {
    const { store, lists, writes } = harness();
    void store.start('u1');
    lists[0].resolve({ enabled: true, entries: [DORM] });
    await settle();
    const removed = store.remove('e1');
    expect(store.getSnapshot().removing).toEqual(['e1']);
    writes[0].resolve({ ok: false, failure: 'failed' });
    expect((await removed).ok).toBe(false);
    expect(store.getSnapshot().removing).toEqual([]);
    expect(store.getSnapshot().data?.entries).toEqual([DORM]);
    expect(store.getSnapshot().failure).toEqual({ write: 'remove', reason: 'failed' });
    expect(lists).toHaveLength(2);
  });

  test('a saved value replaces the entry with the same label', async () => {
    const { store, lists, writes } = harness();
    void store.start('u1');
    lists[0].resolve({ enabled: true, entries: [DORM] });
    await settle();
    const saved = store.save({ id: null, kind: 'place', label: '宿舍', content: 'Pyramid' });
    writes[0].resolve({ ok: true, value: { ...DORM, id: 'e1', content: 'Pyramid' } });
    await saved;
    expect(store.getSnapshot().data?.entries.map((entry) => entry.content)).toEqual(['Pyramid']);
  });

  test('the switch shows the server answer, not the tap', async () => {
    const { store, lists, writes } = harness();
    void store.start('u1');
    lists[0].resolve({ enabled: true, entries: [] });
    await settle();
    const switched = store.setEnabled(false);
    expect(store.getSnapshot().data?.enabled).toBe(true);
    expect(store.getSnapshot().writing).toBe('switch');
    writes[0].resolve({ ok: true, value: false });
    await switched;
    expect(store.getSnapshot().data?.enabled).toBe(false);
  });

  test('a write that lands after sign-out changes nothing', async () => {
    const { store, lists, writes } = harness();
    void store.start('u1');
    lists[0].resolve({ enabled: true, entries: [DORM] });
    await settle();
    const cleared = store.clearAll();
    store.forget();
    writes[0].resolve({ ok: true, value: null });
    await cleared;
    expect(store.getSnapshot()).toMatchObject({ userId: null, data: null, writing: null });
  });
});

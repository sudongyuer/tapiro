import { describe, expect, test } from 'bun:test';

import { info, settle, setup } from './chatStoreHarness';

describe('thread list', () => {
  const row = (id: string) => ({ ...info({ id }), lastMessage: null });

  test('the list loads once, pages on, and never repeats a thread', async () => {
    const ctx = setup();
    void ctx.store.loadList();
    expect(ctx.store.getSnapshot().list.status).toBe('loading');
    ctx.queues.listThreads[0].resolve({
      items: [row('a'), row('b')],
      hasMore: true,
      nextCursor: 'k1',
    });
    await settle();
    void ctx.store.loadMoreThreads();
    expect(ctx.named('listThreads').at(-1)?.args).toEqual(['k1']);
    ctx.queues.listThreads[1].resolve({
      items: [row('b'), row('c')],
      hasMore: false,
      nextCursor: null,
    });
    await settle();
    const list = ctx.store.getSnapshot().list;
    expect(list.status === 'ready' && list.threads.map((thread) => thread.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  test('a reload asks again for every row already shown, up to 100, and replaces the list', async () => {
    const rows = (prefix: string, n: number) =>
      Array.from({ length: n }, (_, index) => row(`${prefix}${index}`));
    const ctx = setup();
    void ctx.store.loadList();
    ctx.queues.listThreads[0].resolve({ items: rows('a', 50), hasMore: true, nextCursor: 'k1' });
    await settle();
    expect(ctx.named('listThreads')[0].args).toEqual([null, 50]);
    void ctx.store.loadMoreThreads();
    ctx.queues.listThreads[1].resolve({ items: rows('b', 20), hasMore: true, nextCursor: 'k2' });
    await settle();
    ctx.store.onSignal({ kind: 'chat.message', id: 'x', at: null });
    expect(ctx.named('listThreads')[2].args).toEqual([null, 70]);
    ctx.queues.listThreads[2].resolve({
      items: [row('n'), ...rows('a', 50), ...rows('b', 19)],
      hasMore: true,
      nextCursor: 'k3',
    });
    await settle();
    const list = ctx.store.getSnapshot().list;
    expect(list).toMatchObject({
      status: 'ready',
      nextCursor: 'k3',
      loadedAt: '2026-11-06T02:00:00.000Z',
    });
    expect(list.status !== 'idle' && list.threads.length).toBe(70);
    expect(list.status !== 'idle' && list.threads[0].id).toBe('n');
    void ctx.store.loadMoreThreads();
    ctx.queues.listThreads[3].resolve({ items: rows('c', 50), hasMore: true, nextCursor: 'k4' });
    await settle();
    ctx.store.onSignal({ kind: 'chat.message', id: 'x', at: null });
    expect(ctx.named('listThreads')[4].args).toEqual([null, 100]);
  });

  test('a failed reload keeps the threads as stale with the time they were loaded', async () => {
    const ctx = setup();
    void ctx.store.loadList();
    ctx.queues.listThreads[0].resolve({ items: [row('a')], hasMore: false, nextCursor: null });
    await settle();
    void ctx.store.reloadList();
    ctx.queues.listThreads[1].reject(new Error('offline'));
    await settle();
    expect(ctx.store.getSnapshot().list).toMatchObject({
      status: 'stale',
      threads: [{ id: 'a' }],
      loadedAt: '2026-11-06T02:00:00.000Z',
    });
  });

  test('a list that fails to load is failed, not empty', async () => {
    const ctx = setup();
    void ctx.store.loadList();
    ctx.queues.listThreads[0].reject(new Error('offline'));
    await settle();
    expect(ctx.store.getSnapshot().list).toMatchObject({ status: 'failed', threads: [] });
  });

  test('a page that answers after the list was reloaded is dropped', async () => {
    const ctx = setup();
    void ctx.store.loadList();
    ctx.queues.listThreads[0].resolve({ items: [row('a')], hasMore: true, nextCursor: 'k1' });
    await settle();
    void ctx.store.loadMoreThreads();
    ctx.store.onSignal({ kind: 'chat.message', id: 'x', at: null });
    ctx.queues.listThreads[2].resolve({
      items: [row('z'), row('a')],
      hasMore: false,
      nextCursor: null,
    });
    await settle();
    ctx.queues.listThreads[1].resolve({ items: [row('b')], hasMore: false, nextCursor: null });
    await settle();
    const list = ctx.store.getSnapshot().list;
    expect(list.status !== 'idle' && list.threads.map((thread) => thread.id)).toEqual(['z', 'a']);
    expect(list.status !== 'idle' && list.more).toBe('idle');
  });
});

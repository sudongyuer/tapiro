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

  test('a reload keeps the pages already shown when its first page joins them', async () => {
    const ctx = setup();
    void ctx.store.loadList();
    ctx.queues.listThreads[0].resolve({
      items: [row('a'), row('b')],
      hasMore: true,
      nextCursor: 'k1',
    });
    await settle();
    void ctx.store.loadMoreThreads();
    ctx.queues.listThreads[1].resolve({ items: [row('c')], hasMore: false, nextCursor: null });
    await settle();
    ctx.store.onSignal({ kind: 'chat.message', id: 'x', at: null });
    ctx.queues.listThreads[2].resolve({
      items: [row('n'), row('a')],
      hasMore: true,
      nextCursor: 'ka',
    });
    await settle();
    expect(ctx.store.getSnapshot().list).toMatchObject({
      status: 'ready',
      hasMore: false,
      nextCursor: null,
      loadedAt: '2026-11-06T02:00:00.000Z',
    });
    const list = ctx.store.getSnapshot().list;
    expect(list.status !== 'idle' && list.threads.map((thread) => thread.id)).toEqual([
      'n',
      'a',
      'b',
      'c',
    ]);
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

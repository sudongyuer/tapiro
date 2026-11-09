import { describe, expect, test } from 'bun:test';

import { info, noAppState, settle, setup } from './chatStoreHarness';

const row = (id: string) => ({ ...info({ id }), lastMessage: null });
const firstPage = (ids: string[], nextCursor: string | null = 'k1') => ({
  items: ids.map(row),
  hasMore: nextCursor !== null,
  nextCursor,
});

async function loaded(ctx: ReturnType<typeof setup>) {
  void ctx.store.loadList();
  ctx.queues.listThreads[0].resolve(firstPage(['a']));
  await settle();
}

const cursors = (ctx: ReturnType<typeof setup>) =>
  ctx.named('listThreads').map((call) => call.args[0]);

const threadIds = (ctx: ReturnType<typeof setup>) => {
  const list = ctx.store.getSnapshot().list;
  return list.status === 'idle' ? [] : list.threads.map((thread) => thread.id);
};

describe('thread list paging around a reload', () => {
  test('a next page asked for during a reload waits for it, then loads once', async () => {
    const ctx = setup();
    await loaded(ctx);
    void ctx.store.reloadList();
    void ctx.store.loadMoreThreads();
    expect(cursors(ctx)).toEqual([null, null]);
    ctx.queues.listThreads[1].resolve(firstPage(['a']));
    await settle();
    expect(cursors(ctx)).toEqual([null, null, 'k1']);
    void ctx.store.loadMoreThreads();
    ctx.queues.listThreads[2].resolve(firstPage(['b'], null));
    await settle();
    expect(cursors(ctx)).toEqual([null, null, 'k1']);
    expect(threadIds(ctx)).toEqual(['a', 'b']);
  });

  test('a page that lands after a reload is read again from the new head', async () => {
    const ctx = setup();
    await loaded(ctx);
    void ctx.store.loadMoreThreads();
    void ctx.store.reloadList();
    ctx.queues.listThreads[2].resolve(firstPage(['z', 'a'], 'k2'));
    await settle();
    ctx.queues.listThreads[1].resolve(firstPage(['old'], null));
    await settle();
    expect(cursors(ctx)).toEqual([null, 'k1', null, 'k2']);
    ctx.queues.listThreads[3].resolve(firstPage(['b'], null));
    await settle();
    expect(threadIds(ctx)).toEqual(['z', 'a', 'b']);
  });

  test('a page that fails after a reload leaves no retry row and is read again', async () => {
    const ctx = setup();
    await loaded(ctx);
    void ctx.store.loadMoreThreads();
    void ctx.store.reloadList();
    ctx.queues.listThreads[2].resolve(firstPage(['a'], 'k2'));
    await settle();
    ctx.queues.listThreads[1].reject(new Error('offline'));
    await settle();
    expect(cursors(ctx)).toEqual([null, 'k1', null, 'k2']);
    const list = ctx.store.getSnapshot().list;
    expect(list.status !== 'idle' && list.more).toBe('loading');
  });

  test('a late answer from a page already replaced does not end the newer page', async () => {
    const ctx = setup();
    await loaded(ctx);
    void ctx.store.loadMoreThreads();
    void ctx.store.reloadList();
    ctx.queues.listThreads[2].resolve(firstPage(['a'], 'k2'));
    await settle();
    void ctx.store.loadMoreThreads();
    expect(cursors(ctx)).toEqual([null, 'k1', null, 'k2']);
    ctx.queues.listThreads[1].resolve(firstPage(['old'], null));
    await settle();
    expect(cursors(ctx)).toEqual([null, 'k1', null, 'k2']);
    const list = ctx.store.getSnapshot().list;
    expect(list.status !== 'idle' && list.more).toBe('loading');
    expect(threadIds(ctx)).toEqual(['a']);
  });

  test('a next page asked for during a reload that fails still loads', async () => {
    const ctx = setup();
    await loaded(ctx);
    void ctx.store.reloadList();
    void ctx.store.loadMoreThreads();
    ctx.queues.listThreads[1].reject(new Error('offline'));
    await settle();
    expect(ctx.store.getSnapshot().list.status).toBe('stale');
    expect(cursors(ctx)).toEqual([null, null, 'k1']);
  });

  test('a stale list still pages on', async () => {
    const ctx = setup();
    await loaded(ctx);
    void ctx.store.reloadList();
    ctx.queues.listThreads[1].reject(new Error('offline'));
    await settle();
    void ctx.store.loadMoreThreads();
    expect(cursors(ctx)).toEqual([null, null, 'k1']);
    ctx.queues.listThreads[2].resolve(firstPage(['b'], null));
    await settle();
    expect(ctx.store.getSnapshot().list.status).toBe('stale');
    expect(threadIds(ctx)).toEqual(['a', 'b']);
  });

  test('a page that fails before the reload lands is read again after it, with no retry row', async () => {
    const ctx = setup();
    await loaded(ctx);
    void ctx.store.loadMoreThreads();
    void ctx.store.reloadList();
    ctx.queues.listThreads[1].reject(new Error('offline'));
    await settle();
    const during = ctx.store.getSnapshot().list;
    expect(during.status !== 'idle' && during.more).toBe('idle');
    expect(cursors(ctx)).toEqual([null, 'k1', null]);
    ctx.queues.listThreads[2].resolve(firstPage(['a'], 'k2'));
    await settle();
    expect(cursors(ctx)).toEqual([null, 'k1', null, 'k2']);
  });

  test('a failed page with no reload out still shows its retry row', async () => {
    const ctx = setup();
    await loaded(ctx);
    void ctx.store.loadMoreThreads();
    ctx.queues.listThreads[1].reject(new Error('offline'));
    await settle();
    const list = ctx.store.getSnapshot().list;
    expect(list.status !== 'idle' && list.more).toBe('failed');
    expect(cursors(ctx)).toEqual([null, 'k1']);
  });

  test('a next page wanted before sign-out is not read for the next account', async () => {
    const ctx = setup();
    await loaded(ctx);
    void ctx.store.reloadList();
    void ctx.store.loadMoreThreads();
    ctx.store.clear();
    ctx.store.follow('other', noAppState as never);
    void ctx.store.loadList();
    ctx.queues.listThreads[2].resolve(firstPage(['n']));
    ctx.queues.listThreads[1].resolve(firstPage(['a']));
    await settle();
    expect(cursors(ctx)).toEqual([null, null, null]);
    expect(threadIds(ctx)).toEqual(['n']);
  });

  test("a next page refused during the last account's reload still loads", async () => {
    const ctx = setup();
    await loaded(ctx);
    void ctx.store.reloadList();
    ctx.store.clear();
    ctx.store.follow('other', noAppState as never);
    void ctx.store.loadList();
    ctx.queues.listThreads[2].resolve(firstPage(['n']));
    await settle();
    void ctx.store.loadMoreThreads();
    expect(cursors(ctx)).toEqual([null, null, null]);
    ctx.queues.listThreads[1].resolve(firstPage(['a']));
    await settle();
    expect(cursors(ctx)).toEqual([null, null, null, 'k1']);
  });
});

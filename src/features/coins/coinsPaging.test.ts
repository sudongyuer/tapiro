import { describe, expect, test } from 'bun:test';

import { createCodeDrafts } from './codeDrafts';
import { createCoinsStore } from './coinsStore';
import type { CoinRow, CoinsService } from './types';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

const unused = () => Promise.reject(new Error('unexpected'));

function setup({ history }: Pick<CoinsService, 'history'>) {
  const service: CoinsService = {
    balance: unused,
    history,
    feedStatus: unused,
    feed: unused,
    invite: unused,
    redeem: unused,
  };
  const drafts = createCodeDrafts({ get: () => undefined, set: () => undefined });
  const store = createCoinsStore({ service, drafts });
  store.start('me');
  return { store };
}

const row = (id: number, month: string) => ({
  id,
  reason: 'weekly_feed',
  delta: 1,
  at: `${month}-03T04:00:00+00:00`,
  month,
  item: null,
});

describe('coin history paging around a first-page read', () => {
  test('a page that lands after the first page was read again is read again from the new head', async () => {
    const more = deferred<{ items: CoinRow[]; hasMore: boolean; nextCursor: number | null }>();
    const before: (number | null)[] = [];
    let heads = 0;
    const { store } = setup({
      history: (cursor) => {
        before.push(cursor);
        if (cursor === 3) return more.promise;
        if (cursor === 4)
          return Promise.resolve({
            items: [row(2, '2026-10') as CoinRow],
            hasMore: false,
            nextCursor: null,
          });
        heads += 1;
        return Promise.resolve({
          items: [row(heads === 1 ? 3 : 4, '2026-11') as CoinRow],
          hasMore: true,
          nextCursor: heads === 1 ? 3 : 4,
        });
      },
    });
    await store.reloadHistory();
    const loadingMore = store.loadMoreHistory();
    await store.reloadHistory();
    more.resolve({ items: [row(1, '2026-10') as CoinRow], hasMore: false, nextCursor: null });
    await loadingMore;
    await settle();
    expect(before).toEqual([null, 3, null, 4]);
    const history = store.getSnapshot().history;
    expect(history.status === 'idle' ? [] : history.data?.items.map((item) => item.id)).toEqual([
      4, 2,
    ]);
  });

  test('a next page wanted before sign-out is not read for the next account', async () => {
    const first = deferred<{ items: CoinRow[]; hasMore: boolean; nextCursor: number | null }>();
    const before: (number | null)[] = [];
    const page = { items: [row(3, '2026-11') as CoinRow], hasMore: true, nextCursor: 3 };
    const { store } = setup({
      history: (cursor) => {
        before.push(cursor);
        return before.length === 2 ? first.promise : Promise.resolve(page);
      },
    });
    await store.reloadHistory();
    const reloading = store.reloadHistory();
    await store.loadMoreHistory();
    store.clear();
    store.start('other');
    await store.reloadHistory();
    first.resolve(page);
    await reloading;
    await store.reloadHistory();
    await settle();
    expect(before).toEqual([null, null, null, null]);
  });

  test('a failed page that outlives a first-page read leaves no retry row', async () => {
    const more = deferred<{ items: CoinRow[]; hasMore: boolean; nextCursor: number | null }>();
    let heads = 0;
    const { store } = setup({
      history: (cursor) => {
        if (cursor !== null) return more.promise;
        heads += 1;
        return Promise.resolve({
          items: [row(3, '2026-11') as CoinRow],
          hasMore: heads === 1,
          nextCursor: heads === 1 ? 3 : null,
        });
      },
    });
    await store.reloadHistory();
    const loadingMore = store.loadMoreHistory();
    await store.reloadHistory();
    more.reject(new Error('x'));
    await loadingMore;
    await settle();
    const history = store.getSnapshot().history;
    expect(history.status !== 'idle' && history.data?.more).toBe('idle');
  });

  test('a next page asked for during a read that fails still loads', async () => {
    const first = deferred<{ items: CoinRow[]; hasMore: boolean; nextCursor: number | null }>();
    const before: (number | null)[] = [];
    const page = { items: [row(3, '2026-11') as CoinRow], hasMore: true, nextCursor: 3 };
    const { store } = setup({
      history: (cursor) => {
        before.push(cursor);
        if (cursor !== null)
          return Promise.resolve({ items: [], hasMore: false, nextCursor: null });
        return before.length === 1 ? Promise.resolve(page) : first.promise;
      },
    });
    await store.reloadHistory();
    const reloading = store.reloadHistory();
    await store.loadMoreHistory();
    first.reject(new Error('x'));
    await reloading;
    await settle();
    expect(before).toEqual([null, null, 3]);
  });

  test('a next page asked for while the first page is being read loads once that read lands', async () => {
    const first = deferred<{ items: CoinRow[]; hasMore: boolean; nextCursor: number | null }>();
    const before: (number | null)[] = [];
    let reads = 0;
    const page = { items: [row(3, '2026-11') as CoinRow], hasMore: true, nextCursor: 3 };
    const { store } = setup({
      history: (cursor) => {
        before.push(cursor);
        reads += 1;
        if (cursor !== null)
          return Promise.resolve({
            items: [row(2, '2026-10') as CoinRow],
            hasMore: false,
            nextCursor: null,
          });
        return reads === 1 ? Promise.resolve(page) : first.promise;
      },
    });
    await store.reloadHistory();
    const reloading = store.reloadHistory();
    await store.loadMoreHistory();
    expect(before).toEqual([null, null]);
    first.resolve(page);
    await reloading;
    await settle();
    expect(before).toEqual([null, null, 3]);
    const history = store.getSnapshot().history;
    expect(history.status === 'idle' ? [] : history.data?.items.map((item) => item.id)).toEqual([
      3, 2,
    ]);
  });
});

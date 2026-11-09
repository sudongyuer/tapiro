import { describe, expect, test } from 'bun:test';

import { createProfileStore } from './profileStore';
import {
  card,
  deferred,
  fakeService,
  memoryDrafts,
  ME,
  profileReview,
  settle,
} from './storeHarness';
import { ProfileGoneError } from './reputationService';
import type { ProfileCard, ReplyResult, ReviewPage } from './types';

function setup(service = fakeService()) {
  const { drafts } = memoryDrafts();
  const store = createProfileStore({ service, drafts });
  store.start(ME);
  return { store, drafts };
}

const page = (ids: string[], nextCursor: string | null): ReviewPage => ({
  items: ids.map((id) => profileReview(id)),
  hasMore: nextCursor !== null,
  nextCursor,
});

describe('profile card', () => {
  test('a failed load is failed, never a profile with no reviews', async () => {
    const { store } = setup(fakeService({ profile: () => Promise.reject(new Error('x')) }));
    store.openProfile('p1');
    await settle();
    expect(store.getSnapshot().cards.p1).toEqual({ status: 'failed', data: null });
  });

  test('only a failed read marks a stale profile as a failed refresh', async () => {
    let fail = false;
    const { store } = setup(
      fakeService({
        profile: async (id) => {
          if (fail) throw new Error('x');
          return card({ id });
        },
      }),
    );
    const close = store.openProfile('p1');
    await settle();
    close();
    store.onSignal();
    expect(store.getSnapshot().cards.p1.status).toBe('stale');
    expect(store.getSnapshot().readFailed).toEqual({});
    fail = true;
    await store.reloadCard('p1');
    expect(store.getSnapshot().cards.p1.status).toBe('stale');
    expect(store.getSnapshot().readFailed).toEqual({ 'card:p1': true });
    fail = false;
    await store.reloadCard('p1');
    expect(store.getSnapshot().cards.p1.status).toBe('ready');
    expect(store.getSnapshot().readFailed).toEqual({});
  });

  test('an older failed read does not flag a newer good one as a failed refresh', async () => {
    const first = deferred<ProfileCard>();
    let reads = 0;
    const { store } = setup(
      fakeService({
        profile: (id) => {
          reads += 1;
          return reads === 1 ? first.promise : Promise.resolve(card({ id }));
        },
      }),
    );
    void store.reloadCard('p1');
    await store.reloadCard('p1');
    first.reject(new Error('x'));
    await settle();
    expect(store.getSnapshot().readFailed).toEqual({});
  });

  test('a review signal reloads the profile on screen and marks the others stale', async () => {
    const reads: string[] = [];
    const { store } = setup(
      fakeService({
        profile: async (id) => {
          reads.push(id);
          return card({ id });
        },
      }),
    );
    store.openProfile('p1');
    const close = store.openProfile('p2');
    await settle();
    close();
    store.onSignal();
    await settle();
    expect(reads).toEqual(['p1', 'p2', 'p1']);
    expect(store.getSnapshot().cards.p2.status).toBe('stale');
  });

  test('a block lands on the card and a read already in flight cannot undo it', async () => {
    const read = deferred<ProfileCard>();
    let reads = 0;
    const { store } = setup(
      fakeService({
        profile: () => {
          reads += 1;
          if (reads === 1) return Promise.resolve(card());
          if (reads === 2) return read.promise;
          return Promise.resolve(card({ blockedByMe: true, helped: 5 }));
        },
      }),
    );
    store.openProfile('p1');
    await settle();
    void store.reloadCard('p1');
    store.markBlocked('p1', true);
    read.resolve(card({ blockedByMe: false }));
    await settle();
    const shown = store.getSnapshot().cards.p1;
    expect(shown.status !== 'idle' && shown.data?.blockedByMe).toBe(true);
    expect(shown.status !== 'idle' && shown.data?.helped).toBe(5);
    expect(reads).toBe(3);
  });

  test('a deleted account is told apart from a failed load', async () => {
    const { store } = setup(fakeService({ profile: () => Promise.reject(new ProfileGoneError()) }));
    store.openProfile('p1');
    await settle();
    expect(store.getSnapshot().cards.p1.status).toBe('failed');
    expect(store.getSnapshot().gone.p1).toBe(true);
  });
});

describe('all reviews', () => {
  test('pages append without duplicates and a failed page keeps what was shown', async () => {
    const answers: (ReviewPage | Error)[] = [
      page(['r1', 'r2'], 'c2'),
      new Error('x'),
      page(['r2', 'r3'], null),
    ];
    const cursors: (string | null)[] = [];
    const { store } = setup(
      fakeService({
        profileReviews: async (_id, before) => {
          cursors.push(before);
          const next = answers.shift();
          if (next instanceof Error) throw next;
          return next as ReviewPage;
        },
      }),
    );
    store.openReviews('p1');
    await settle();
    await store.loadMore('p1');
    let list = store.getSnapshot().reviews.p1;
    expect(list.status !== 'idle' && list.data?.more).toBe('failed');
    expect(list.status !== 'idle' && list.data?.items.map((row) => row.id)).toEqual(['r1', 'r2']);
    await store.loadMore('p1');
    list = store.getSnapshot().reviews.p1;
    expect(list.status !== 'idle' && list.data?.items.map((row) => row.id)).toEqual([
      'r1',
      'r2',
      'r3',
    ]);
    expect(list.status !== 'idle' && list.data?.hasMore).toBe(false);
    expect(cursors).toEqual([null, 'c2', 'c2']);
  });
});

describe('reply in flight', () => {
  test('a list read in flight when the reply lands cannot hide the reply', async () => {
    const read = deferred<ReviewPage>();
    let reads = 0;
    const replied = { body: '谢谢', createdAt: '2026-11-06T05:00:00Z' };
    const { store } = setup(
      fakeService({
        profileReviews: () => {
          reads += 1;
          if (reads === 1) return Promise.resolve(page(['r1'], null));
          if (reads === 2) return read.promise;
          return Promise.resolve({
            ...page(['r1'], null),
            items: [profileReview('r1', { reply: replied })],
          });
        },
        reply: async (reviewId, body) => ({ ok: true, reviewId, reply: { ...replied, body } }),
      }),
    );
    store.openReviews('p1');
    await settle();
    void store.reloadList('p1');
    await store.reply('r1', '谢谢');
    read.resolve(page(['r1'], null));
    await settle();
    const list = store.getSnapshot().reviews.p1;
    expect(list.status !== 'idle' && list.data?.items[0].reply?.body).toBe('谢谢');
  });

  test('a page that lands after the head was read again is dropped for the new head', async () => {
    const more = deferred<ReviewPage>();
    const before: (string | null)[] = [];
    let heads = 0;
    const { store } = setup(
      fakeService({
        profileReviews: (_id, cursor) => {
          before.push(cursor);
          if (cursor === 'c1') return more.promise;
          if (cursor === 'c2') return Promise.resolve(page(['r3'], null));
          heads += 1;
          return Promise.resolve(heads === 1 ? page(['r2', 'r3'], 'c1') : page(['r1', 'r2'], 'c2'));
        },
      }),
    );
    store.openReviews('p1');
    await settle();
    const loadingMore = store.loadMore('p1');
    await store.reloadList('p1');
    more.resolve(page(['r4'], null));
    await loadingMore;
    await settle();
    expect(before).toEqual([null, 'c1', null, 'c2']);
    const list = store.getSnapshot().reviews.p1;
    expect(list.status !== 'idle' && list.data?.items.map((row) => row.id)).toEqual([
      'r1',
      'r2',
      'r3',
    ]);
    expect(list.status !== 'idle' && list.data?.more).toBe('idle');
  });

  test('a page that fails before a head read lands is read again after it', async () => {
    const more = deferred<ReviewPage>();
    const head = deferred<ReviewPage>();
    const before: (string | null)[] = [];
    const { store } = setup(
      fakeService({
        profileReviews: (_id, cursor) => {
          before.push(cursor);
          if (before.length === 1) return Promise.resolve(page(['r1'], 'c'));
          if (before.length === 2) return more.promise;
          if (before.length === 3) return head.promise;
          return Promise.resolve(page(['r2'], null));
        },
      }),
    );
    store.openReviews('p1');
    await settle();
    const loadingMore = store.loadMore('p1');
    const reloading = store.reloadList('p1');
    more.reject(new Error('x'));
    await loadingMore;
    const during = store.getSnapshot().reviews.p1;
    expect(during.status !== 'idle' && during.data?.more).toBe('idle');
    head.resolve(page(['r1'], 'c'));
    await reloading;
    await settle();
    expect(before).toEqual([null, 'c', null, 'c']);
  });

  test('a next page asked for while the first page is being read loads once that read lands', async () => {
    const head = deferred<ReviewPage>();
    const before: (string | null)[] = [];
    const { store } = setup(
      fakeService({
        profileReviews: (_id, cursor) => {
          before.push(cursor);
          if (cursor) return Promise.resolve(page(['r3'], null));
          return before.length === 1 ? Promise.resolve(page(['r1', 'r2'], 'c')) : head.promise;
        },
      }),
    );
    store.openReviews('p1');
    await settle();
    const reloading = store.reloadList('p1');
    await store.loadMore('p1');
    expect(before).toEqual([null, null]);
    head.resolve(page(['r0', 'r1'], 'c2'));
    await reloading;
    await settle();
    expect(before).toEqual([null, null, 'c2']);
    const list = store.getSnapshot().reviews.p1;
    expect(list.status !== 'idle' && list.data?.items.map((row) => row.id)).toEqual([
      'r0',
      'r1',
      'r3',
    ]);
  });

  test('a next page asked for during a read that fails still loads from the rows on screen', async () => {
    const head = deferred<ReviewPage>();
    const before: (string | null)[] = [];
    const { store } = setup(
      fakeService({
        profileReviews: (_id, cursor) => {
          before.push(cursor);
          if (cursor) return Promise.resolve(page(['r3'], null));
          return before.length === 1 ? Promise.resolve(page(['r1', 'r2'], 'c')) : head.promise;
        },
      }),
    );
    store.openReviews('p1');
    await settle();
    const reloading = store.reloadList('p1');
    await store.loadMore('p1');
    head.reject(new Error('x'));
    await reloading;
    await settle();
    expect(before).toEqual([null, null, 'c']);
  });

  test('a next page wanted by the last account is not read for the next one', async () => {
    const head = deferred<ReviewPage>();
    const before: (string | null)[] = [];
    const { store } = setup(
      fakeService({
        profileReviews: (_id, cursor) => {
          before.push(cursor);
          if (before.length === 2) return head.promise;
          return Promise.resolve(page(['r1'], 'c'));
        },
      }),
    );
    store.openReviews('p1');
    await settle();
    const reloading = store.reloadList('p1');
    await store.loadMore('p1');
    store.clear();
    store.start('other');
    store.openReviews('p1');
    await settle();
    head.resolve(page(['r1'], 'c'));
    await reloading;
    await settle();
    await store.reloadList('p1');
    await settle();
    expect(before).toEqual([null, null, null, null]);
  });

  test('a failed page that outlives a head read leaves no retry row on a list with no more', async () => {
    const more = deferred<ReviewPage>();
    let heads = 0;
    const { store } = setup(
      fakeService({
        profileReviews: (_id, cursor) => {
          if (cursor) return more.promise;
          heads += 1;
          return Promise.resolve(heads === 1 ? page(['r1'], 'c') : page(['r0', 'r1'], null));
        },
      }),
    );
    store.openReviews('p1');
    await settle();
    const loadingMore = store.loadMore('p1');
    await store.reloadList('p1');
    more.reject(new Error('x'));
    await loadingMore;
    await settle();
    const list = store.getSnapshot().reviews.p1;
    expect(list.status !== 'idle' && list.data?.more).toBe('idle');
  });

  test('a page appended to a stale list keeps it stale', async () => {
    const { store } = setup(
      fakeService({
        profileReviews: async (_id, before) =>
          before ? page(['r3'], null) : page(['r1', 'r2'], 'c'),
      }),
    );
    const close = store.openReviews('p1');
    await settle();
    close();
    store.onSignal();
    await store.loadMore('p1');
    const list = store.getSnapshot().reviews.p1;
    expect(list.status).toBe('stale');
    expect(list.status !== 'idle' && list.data?.items.map((row) => row.id)).toEqual([
      'r1',
      'r2',
      'r3',
    ]);
  });
});

describe('reply', () => {
  test('the reply is stored before the call, kept after a failure and never resent by itself', async () => {
    const answer = deferred<ReplyResult>();
    let calls = 0;
    const { store, drafts } = setup(
      fakeService({
        profile: async () => card(),
        reply: () => {
          calls += 1;
          return answer.promise;
        },
      }),
    );
    store.openProfile('p1');
    await settle();
    const done = store.reply('r1', ' 那天电梯坏了 ');
    expect(drafts.reply(ME, 'r1')).toBe(' 那天电梯坏了 ');
    expect(await store.reply('r1', ' 那天电梯坏了 ')).toBe(false);
    answer.resolve({ ok: false, failure: 'failed' });
    expect(await done).toBe(false);
    await settle();
    expect(store.getSnapshot().replies.r1).toEqual({ phase: 'failed', failure: 'failed' });
    expect(drafts.reply(ME, 'r1')).toBe(' 那天电梯坏了 ');
    expect(calls).toBe(1);
  });

  test('a sent reply shows under the review on the card and in the list, and the draft goes', async () => {
    const sent: string[] = [];
    const { store, drafts } = setup(
      fakeService({
        profile: async () => card(),
        profileReviews: async () => page(['r1', 'r2'], null),
        reply: async (reviewId, body) => {
          sent.push(body);
          return { ok: true, reviewId, reply: { body, createdAt: '2026-11-06T05:00:00Z' } };
        },
      }),
    );
    store.openProfile('p1');
    store.openReviews('p1');
    await settle();
    expect(await store.reply('r1', ' 谢谢 ')).toBe(true);
    expect(sent).toEqual(['谢谢']);
    const shown = store.getSnapshot().cards.p1;
    expect(shown.status !== 'idle' && shown.data?.latestReviews[0].reply?.body).toBe('谢谢');
    const list = store.getSnapshot().reviews.p1;
    expect(list.status !== 'idle' && list.data?.items[0].reply?.body).toBe('谢谢');
    expect(drafts.reply(ME, 'r1')).toBe('');
  });

  test('an empty or too long reply is not sent', async () => {
    let calls = 0;
    const { store } = setup(
      fakeService({
        reply: async () => {
          calls += 1;
          return { ok: false, failure: 'failed' };
        },
      }),
    );
    expect(await store.reply('r1', ' ​ ')).toBe(false);
    expect(await store.reply('r1', '好'.repeat(201))).toBe(false);
    expect(calls).toBe(0);
  });

  test('already replied reloads the profile to show the stored reply', async () => {
    let reads = 0;
    const { store } = setup(
      fakeService({
        profile: async () => {
          reads += 1;
          return card();
        },
        reply: async () => ({ ok: false, failure: 'alreadyReplied' }),
      }),
    );
    store.openProfile('p1');
    await settle();
    await store.reply('r1', '别的话');
    await settle();
    expect(reads).toBe(2);
  });
});

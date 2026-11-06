import { describe, expect, test } from 'bun:test';

import { createReviewStore } from './reviewStore';
import {
  deferred,
  fakeService,
  memoryDrafts,
  ME,
  pair,
  pending,
  sealed,
  settle,
} from './storeHarness';
import type { PendingReview, ReviewPair, ReviewTarget, SubmitResult } from './types';

const TARGET: ReviewTarget = { kind: 'bounty', itemId: 'b1', reviewee: 'p1' };
const DRAFT = { face: 'happy' as const, chips: ['on_time'], sentence: ' 谢谢 ' };

function setup(service = fakeService()) {
  const { drafts, settings } = memoryDrafts();
  const store = createReviewStore({ service, drafts });
  store.start(ME);
  return { store, drafts, settings };
}

describe('pending reviews', () => {
  test('a failed first load is failed, never an empty list', async () => {
    const { store } = setup(fakeService({ pendingReviews: () => Promise.reject(new Error('x')) }));
    store.loadPending();
    expect(store.getSnapshot().pending).toEqual({ status: 'loading', data: null });
    await settle();
    expect(store.getSnapshot().pending).toEqual({ status: 'failed', data: null });
  });

  test('a failed reload keeps the rows and marks them stale', async () => {
    let fail = false;
    const { store } = setup(
      fakeService({
        pendingReviews: () =>
          fail ? Promise.reject(new Error('x')) : Promise.resolve([pending()]),
      }),
    );
    store.loadPending();
    await settle();
    fail = true;
    await store.reloadPending();
    expect(store.getSnapshot().pending).toEqual({ status: 'stale', data: [pending()] });
  });

  test('an older answer landing after a newer one is ignored', async () => {
    const answers = [deferred<PendingReview[]>(), deferred<PendingReview[]>()];
    let call = 0;
    const { store } = setup(fakeService({ pendingReviews: () => answers[call++].promise }));
    void store.reloadPending();
    void store.reloadPending();
    answers[1].resolve([]);
    await settle();
    answers[0].resolve([pending()]);
    await settle();
    expect(store.getSnapshot().pending).toEqual({ status: 'ready', data: [] });
  });
});

describe('submit', () => {
  test('the draft is stored before the call and stays after a failure, with no automatic retry', async () => {
    const answer = deferred<SubmitResult>();
    let calls = 0;
    const { store, drafts } = setup(
      fakeService({
        submitReview: () => {
          calls += 1;
          return answer.promise;
        },
      }),
    );
    const done = store.submit(TARGET, 'helper', DRAFT);
    expect(drafts.review(ME, 'bounty:b1:p1')).toEqual(DRAFT);
    expect(store.getSnapshot().submits['bounty:b1:p1']).toEqual({ phase: 'sending' });
    expect(await store.submit(TARGET, 'helper', DRAFT)).toBe(false);
    answer.resolve({ ok: false, failure: 'failed' });
    expect(await done).toBe(false);
    expect(store.getSnapshot().submits['bounty:b1:p1']).toEqual({
      phase: 'failed',
      failure: 'failed',
    });
    expect(drafts.review(ME, 'bounty:b1:p1')).toEqual(DRAFT);
    await settle();
    expect(calls).toBe(1);
  });

  test('the trimmed draft is sent and an invalid draft is kept but not sent', async () => {
    const sent: unknown[] = [];
    const { store, drafts } = setup(
      fakeService({
        submitReview: async (_target, draft) => {
          sent.push(draft);
          return { ok: true, pair: sealed(pair()) };
        },
      }),
    );
    const invalid = { face: 'happy' as const, chips: ['late'], sentence: '' };
    expect(await store.submit(TARGET, 'helper', invalid)).toBe(false);
    expect(drafts.review(ME, 'bounty:b1:p1')).toEqual(invalid);
    expect(sent).toEqual([]);
    expect(await store.submit(TARGET, 'helper', DRAFT)).toBe(true);
    expect(sent).toEqual([{ face: 'happy', chips: ['on_time'], sentence: '谢谢' }]);
  });

  test('success clears the draft, replaces the pair and leaves the pending list', async () => {
    const other = pair({ counterpart: { id: 'p2', name: 'Mei', avatarUrl: null } });
    const { store, drafts } = setup(
      fakeService({
        reviewState: async () => [pair(), other],
        pendingReviews: async () => [pending(), pending({ itemId: 'b2' })],
        submitReview: async () => ({ ok: true, pair: sealed(pair()) }),
      }),
    );
    store.openItem('bounty', 'b1');
    store.loadPending();
    await settle();
    expect(await store.submit(TARGET, 'helper', DRAFT)).toBe(true);
    const item = store.getSnapshot().items['bounty:b1'];
    expect(item.status).toBe('ready');
    expect(item.status !== 'idle' && item.data?.map((row) => row.state)).toEqual([
      'sealed',
      'open',
    ]);
    const list = store.getSnapshot().pending;
    expect(list.status !== 'idle' && list.data?.map((row) => row.itemId)).toEqual(['b2']);
    expect(drafts.review(ME, 'bounty:b1:p1')).toBeNull();
    expect(store.getSnapshot().submits['bounty:b1:p1']).toBeUndefined();
  });

  test('a read in flight when the submit lands is dropped and read again after the write', async () => {
    const read = deferred<ReviewPair[]>();
    let reads = 0;
    const other = pair({ counterpart: { id: 'p2', name: 'Mei', avatarUrl: null } });
    const { store } = setup(
      fakeService({
        reviewState: () => {
          reads += 1;
          if (reads === 1) return Promise.resolve([pair(), other]);
          if (reads === 2) return read.promise;
          return Promise.resolve([sealed(pair()), { ...other, theyReviewed: true }]);
        },
        submitReview: async () => ({ ok: true, pair: sealed(pair()) }),
      }),
    );
    store.openItem('bounty', 'b1');
    await settle();
    void store.reloadItem('bounty', 'b1');
    await store.submit(TARGET, 'helper', DRAFT);
    read.resolve([pair(), other]);
    await settle();
    expect(reads).toBe(3);
    const item = store.getSnapshot().items['bounty:b1'];
    expect(
      item.status !== 'idle' && item.data?.map((row) => [row.state, row.theyReviewed]),
    ).toEqual([
      ['sealed', false],
      ['open', true],
    ]);
  });

  test('a submit with no read in flight does not read again', async () => {
    let reads = 0;
    const { store } = setup(
      fakeService({
        reviewState: async () => {
          reads += 1;
          return [pair()];
        },
        submitReview: async () => ({ ok: true, pair: sealed(pair()) }),
      }),
    );
    store.openItem('bounty', 'b1');
    await settle();
    await store.submit(TARGET, 'helper', DRAFT);
    await settle();
    expect(reads).toBe(1);
  });

  test('an invalid draft is kept and reported as invalid without a call', async () => {
    const { store } = setup();
    expect(await store.submit(TARGET, 'helper', { face: null, chips: [], sentence: 'x' })).toBe(
      false,
    );
    expect(store.getSnapshot().submits['bounty:b1:p1']).toEqual({
      phase: 'failed',
      failure: 'invalid',
    });
  });

  test('a reply to a review I received shows on the pair', async () => {
    const theirs = {
      id: 'rv9',
      face: 'happy' as const,
      chips: [],
      sentence: null,
      submittedAt: '2026-11-06T01:00:00Z',
      shownAt: '2026-11-06T02:00:00Z',
      reply: null,
    };
    const { store } = setup(
      fakeService({ reviewState: async () => [pair({ state: 'revealed', theirs })] }),
    );
    store.openItem('bounty', 'b1');
    await settle();
    store.applyReply('rv9', { body: '谢谢', createdAt: '2026-11-06T03:00:00Z' });
    const item = store.getSnapshot().items['bounty:b1'];
    expect(item.status !== 'idle' && item.data?.[0].theirs?.reply?.body).toBe('谢谢');
  });

  test('a closed or locked answer reloads the item and the pending list and keeps the draft', async () => {
    let reads = 0;
    let pendingReads = 0;
    const { store, drafts } = setup(
      fakeService({
        reviewState: async () => {
          reads += 1;
          return [pair({ state: 'ended' })];
        },
        pendingReviews: async () => {
          pendingReads += 1;
          return [];
        },
        submitReview: async () => ({ ok: false, failure: 'closed' }),
      }),
    );
    store.openItem('bounty', 'b1');
    await settle();
    expect(await store.submit(TARGET, 'helper', DRAFT)).toBe(false);
    await settle();
    expect(reads).toBe(2);
    expect(pendingReads).toBe(1);
    expect(drafts.review(ME, 'bounty:b1:p1')).toEqual(DRAFT);
  });

  test('an answer for a signed-out user changes nothing', async () => {
    const answer = deferred<SubmitResult>();
    const { store, drafts } = setup(fakeService({ submitReview: () => answer.promise }));
    const done = store.submit(TARGET, 'helper', DRAFT);
    store.clear();
    answer.resolve({ ok: true, pair: sealed(pair()) });
    expect(await done).toBe(false);
    expect(store.getSnapshot().items).toEqual({});
    expect(drafts.review(ME, 'bounty:b1:p1')).toEqual(DRAFT);
  });
});

describe('live signal', () => {
  test('a review signal reloads the open item and the pending list', async () => {
    let reads = 0;
    let pendingReads = 0;
    const { store } = setup(
      fakeService({
        reviewState: async () => {
          reads += 1;
          return [pair({ theyReviewed: reads > 1 })];
        },
        pendingReviews: async () => {
          pendingReads += 1;
          return [];
        },
      }),
    );
    store.openItem('bounty', 'b1');
    store.loadPending();
    await settle();
    store.onSignal({ kind: 'bounty.reviewed', id: 'b1', at: null });
    await settle();
    expect(reads).toBe(2);
    expect(pendingReads).toBe(2);
    const item = store.getSnapshot().items['bounty:b1'];
    expect(item.status !== 'idle' && item.data?.[0].theyReviewed).toBe(true);
  });

  test('an item that is not on screen is marked stale and read again when it opens', async () => {
    let reads = 0;
    const { store } = setup(
      fakeService({
        reviewState: async () => {
          reads += 1;
          return [pair()];
        },
      }),
    );
    const close = store.openItem('ride', 'r1');
    await settle();
    close();
    store.onSignal({ kind: 'ride.reviewed', id: 'r1', at: null });
    expect(store.getSnapshot().items['ride:r1'].status).toBe('stale');
    expect(reads).toBe(1);
    store.openItem('ride', 'r1');
    await settle();
    expect(reads).toBe(2);
    expect(store.getSnapshot().items['ride:r1'].status).toBe('ready');
  });

  test('a read already out when a signal marks the item stale lands as stale', async () => {
    const read = deferred<ReviewPair[]>();
    let reads = 0;
    const { store } = setup(
      fakeService({
        reviewState: () => (reads++ === 0 ? Promise.resolve([pair()]) : read.promise),
      }),
    );
    const close = store.openItem('ride', 'r1');
    await settle();
    close();
    void store.reloadItem('ride', 'r1');
    store.onSignal({ kind: 'ride.reviewed', id: 'r1', at: null });
    read.resolve([pair()]);
    await settle();
    expect(store.getSnapshot().items['ride:r1'].status).toBe('stale');
  });

  test('a signal for another kind or item reads nothing for this one', async () => {
    let reads = 0;
    const { store } = setup(
      fakeService({
        reviewState: async () => {
          reads += 1;
          return [pair()];
        },
      }),
    );
    store.openItem('bounty', 'b1');
    await settle();
    store.onSignal({ kind: 'ride.reviewed', id: 'b1', at: null });
    store.onSignal({ kind: 'bounty.reviewed', id: 'b2', at: null });
    store.onSignal({ kind: 'bounty.selected', id: 'b1', at: null });
    await settle();
    expect(reads).toBe(1);
  });

  test('a resync reloads every open item and the pending list', async () => {
    let reads = 0;
    let pendingReads = 0;
    const { store } = setup(
      fakeService({
        reviewState: async () => {
          reads += 1;
          return [];
        },
        pendingReviews: async () => {
          pendingReads += 1;
          return [];
        },
      }),
    );
    store.openItem('bounty', 'b1');
    store.openItem('ride', 'r1');
    store.loadPending();
    await settle();
    store.onSignal(null);
    await settle();
    expect(reads).toBe(4);
    expect(pendingReads).toBe(2);
  });
});

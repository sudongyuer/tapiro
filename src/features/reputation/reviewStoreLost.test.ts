import { describe, expect, test } from 'bun:test';

import { createReviewStore } from './reviewStore';
import { deferred, fakeService, memoryDrafts, ME, pair, settle } from './storeHarness';
import type { ReviewPair, ReviewTarget } from './types';

const TARGET: ReviewTarget = { kind: 'bounty', itemId: 'b1', reviewee: 'p1' };
const DRAFT = { face: 'happy' as const, chips: ['on_time'], sentence: ' 谢谢 ' };

function setup(service = fakeService()) {
  const { drafts, settings } = memoryDrafts();
  const store = createReviewStore({ service, drafts });
  store.start(ME);
  return { store, drafts, settings };
}

describe('review store: lost answers and reads', () => {
  const stored = pair({
    state: 'sealed',
    mine: {
      id: 'r1',
      face: 'happy',
      chips: ['on_time'],
      sentence: '谢谢',
      submittedAt: '2026-11-06T04:00:00.000Z',
      shownAt: null,
      reply: null,
      editable: true,
    },
  });

  test('a lost answer stays sending through the reload and counts as sent when the review is stored', async () => {
    const read = deferred<ReviewPair[]>();
    let reads = 0;
    const { store, drafts } = setup(
      fakeService({
        reviewState: async () => {
          reads += 1;
          return reads === 1 ? [pair()] : read.promise;
        },
        submitReview: async () => ({ ok: false, failure: 'failed' }),
      }),
    );
    store.openItem('bounty', 'b1');
    await settle();
    const done = store.submit(TARGET, 'helper', DRAFT);
    await settle();
    expect(store.getSnapshot().submits['bounty:b1:p1']).toEqual({ phase: 'sending' });
    read.resolve([stored]);
    expect(await done).toBe(true);
    expect(store.getSnapshot().submits['bounty:b1:p1']).toBeUndefined();
    expect(drafts.review(ME, 'bounty:b1:p1')).toBeNull();
  });

  test('a lost answer whose reload also fails stays a failure and keeps the draft', async () => {
    let reads = 0;
    const { store, drafts } = setup(
      fakeService({
        reviewState: async () => {
          reads += 1;
          if (reads === 1) return [pair()];
          throw new Error('offline');
        },
        submitReview: async () => ({ ok: false, failure: 'failed' }),
      }),
    );
    store.openItem('bounty', 'b1');
    await settle();
    expect(await store.submit(TARGET, 'helper', DRAFT)).toBe(false);
    expect(store.getSnapshot().submits['bounty:b1:p1']).toEqual({
      phase: 'failed',
      failure: 'failed',
    });
    expect(drafts.review(ME, 'bounty:b1:p1')).toEqual(DRAFT);
  });

  test('a locked answer for a review that is already stored counts as sent', async () => {
    const { store } = setup(
      fakeService({
        reviewState: async () => [{ ...stored, state: 'revealed' as const }],
        submitReview: async () => ({ ok: false, failure: 'locked' }),
      }),
    );
    store.openItem('bounty', 'b1');
    await settle();
    expect(await store.submit(TARGET, 'helper', DRAFT)).toBe(true);
  });

  test('a locked answer for a different review stays a refusal', async () => {
    const { store, drafts } = setup(
      fakeService({
        reviewState: async () => [{ ...stored, state: 'revealed' as const }],
        submitReview: async () => ({ ok: false, failure: 'locked' }),
      }),
    );
    store.openItem('bounty', 'b1');
    await settle();
    const other = { ...DRAFT, chips: [] };
    expect(await store.submit(TARGET, 'helper', other)).toBe(false);
    expect(store.getSnapshot().submits['bounty:b1:p1']).toEqual({
      phase: 'failed',
      failure: 'locked',
    });
    expect(drafts.review(ME, 'bounty:b1:p1')).toEqual(other);
  });

  test('a failed refresh is marked until a read answers, and a sign-out clears the mark', async () => {
    let reads = 0;
    const { store } = setup(
      fakeService({
        reviewState: async () => {
          reads += 1;
          if (reads === 2) throw new Error('offline');
          return [pair()];
        },
      }),
    );
    store.openItem('bounty', 'b1');
    await settle();
    await store.reloadItem('bounty', 'b1');
    expect(store.getSnapshot().readFailed['bounty:b1']).toBe(true);
    expect(store.getSnapshot().items['bounty:b1']?.status).toBe('stale');
    await store.reloadItem('bounty', 'b1');
    expect(store.getSnapshot().readFailed['bounty:b1']).toBeUndefined();
    await store.reloadItem('bounty', 'b1');
    store.clear();
    expect(store.getSnapshot().readFailed).toEqual({});
  });

  test('an older read that answers after a newer one failed leaves the mark', async () => {
    const older = deferred<ReviewPair[]>();
    let reads = 0;
    const { store } = setup(
      fakeService({
        reviewState: async () => {
          reads += 1;
          if (reads === 1) return [pair()];
          if (reads === 2) return older.promise;
          throw new Error('offline');
        },
      }),
    );
    store.openItem('bounty', 'b1');
    await settle();
    const first = store.reloadItem('bounty', 'b1');
    await store.reloadItem('bounty', 'b1');
    older.resolve([pair()]);
    await first;
    expect(store.getSnapshot().readFailed['bounty:b1']).toBe(true);
  });

  test('a pull reads only an item on screen, so nothing empty is cached before settlement', async () => {
    let reads = 0;
    const { store } = setup(
      fakeService({
        reviewState: async () => {
          reads += 1;
          return [pair()];
        },
      }),
    );
    await store.pullItem('bounty', 'b1');
    expect(reads).toBe(0);
    expect(store.getSnapshot().items['bounty:b1']).toBeUndefined();
    const close = store.openItem('bounty', 'b1');
    await settle();
    expect(reads).toBe(1);
    await store.pullItem('bounty', 'b1');
    expect(reads).toBe(2);
    close();
  });

  test('a settled signal reloads the pending list and marks a cached ride stale', async () => {
    let pendingReads = 0;
    const { store } = setup(
      fakeService({
        pendingReviews: async () => {
          pendingReads += 1;
          return [];
        },
        reviewState: async () => [],
      }),
    );
    const close = store.openItem('ride', 'r1');
    await settle();
    close();
    store.onSettled({ kind: 'ride.settled', id: 'r1' } as never);
    await settle();
    expect(pendingReads).toBe(1);
    expect(store.getSnapshot().items['ride:r1']?.status).toBe('stale');
  });
});

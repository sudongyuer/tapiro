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
        profile: () => (reads++ === 0 ? Promise.resolve(card()) : read.promise),
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

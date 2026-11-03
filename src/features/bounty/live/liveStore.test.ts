import { describe, expect, test } from 'bun:test';

import { createLiveItems } from '@/lib/liveItems';

import { createFixtureLiveService, fixtureLiveBountyId } from './fixtureLiveService';
import { createLiveBountyStore } from './liveStore';
import type { LiveBountyService, SeenCard } from './types';

const USER = 'user-1';
const NOW = new Date('2026-10-29T06:00:00.000Z');

function flaky(failFirstLoad = false) {
  const service = createFixtureLiveService({
    rows: ['posterApplicants', 'applicantNotSelected'],
    failFirstLoad,
    now: () => NOW,
  });
  let failing = false;
  let lists = 0;
  const store = createLiveBountyStore({
    ...service,
    list: () => {
      lists += 1;
      return failing ? Promise.reject(new Error('offline')) : service.list();
    },
  });
  return { store, fail: (next: boolean) => (failing = next), lists: () => lists };
}

const rows = (store: ReturnType<typeof flaky>['store']) => {
  const state = store.getSnapshot();
  return state.status === 'idle' ? [] : state.rows.map((row) => row.bountyId);
};

describe('live bounty store states', () => {
  test('loads the rows for the signed-in user', async () => {
    const { store } = flaky();
    await store.ensureLoaded(USER);
    expect(store.getSnapshot().status).toBe('ready');
    expect(rows(store)).toEqual([
      fixtureLiveBountyId('posterApplicants'),
      fixtureLiveBountyId('applicantNotSelected'),
    ]);
  });

  test('a failed first load is failed, never an empty ready list; retry recovers', async () => {
    const { store } = flaky(true);
    await store.ensureLoaded(USER);
    expect(store.getSnapshot()).toEqual({ status: 'failed', userId: USER, rows: [] });
    await store.retry();
    expect(store.getSnapshot().status).toBe('ready');
    expect(rows(store)).toHaveLength(2);
  });

  test('a failed refresh keeps the rows but marks them stale', async () => {
    const { store, fail } = flaky();
    await store.ensureLoaded(USER);
    fail(true);
    await store.reload(USER);
    expect(store.getSnapshot().status).toBe('stale');
    expect(rows(store)).toHaveLength(2);
    fail(false);
    await store.retry();
    expect(store.getSnapshot().status).toBe('ready');
  });

  test('a loaded user is not reloaded by ensureLoaded', async () => {
    const { store, lists } = flaky();
    await store.ensureLoaded(USER);
    await store.ensureLoaded(USER);
    expect(lists()).toBe(1);
  });

  test('an answer that arrives after sign-out is dropped', async () => {
    const { store } = flaky();
    const pending = store.ensureLoaded(USER);
    store.clear();
    await pending;
    expect(store.getSnapshot()).toEqual({ status: 'idle' });
  });
});

describe('follow', () => {
  function fakeAppState() {
    const listeners = new Set<(state: string) => void>();
    return {
      addEventListener: (_: 'change', listener: (state: string) => void) => {
        listeners.add(listener);
        return { remove: () => listeners.delete(listener) };
      },
      emit: (state: string) => listeners.forEach((listener) => listener(state)),
      count: () => listeners.size,
    };
  }

  test('loads on sign-in, reloads on foreground, clears on sign-out', async () => {
    const { store, lists } = flaky();
    const appState = fakeAppState();
    const stop = store.follow(USER, appState);
    await Promise.resolve();
    expect(lists()).toBe(1);
    appState.emit('background');
    expect(lists()).toBe(1);
    appState.emit('active');
    expect(lists()).toBe(2);
    stop();
    expect(appState.count()).toBe(0);
    store.follow(null, appState);
    expect(store.getSnapshot()).toEqual({ status: 'idle' });
  });
});

describe('markSeen', () => {
  function counting(answers: boolean[]) {
    const calls: { bountyId: string; card: SeenCard }[] = [];
    const service: LiveBountyService = {
      list: async () => [],
      markSeen: async (bountyId, card) => {
        calls.push({ bountyId, card });
        return answers.shift() ?? true;
      },
    };
    return { store: createLiveBountyStore(service), calls };
  }

  test('marks a card once per launch, even when displayed again', async () => {
    const { store, calls } = counting([true]);
    await Promise.all([store.markSeen('b1', 'expired'), store.markSeen('b1', 'expired')]);
    await store.markSeen('b1', 'expired');
    expect(calls).toEqual([{ bountyId: 'b1', card: 'expired' }]);
  });

  test('a failed mark is retried on the next display, not in a loop', async () => {
    const { store, calls } = counting([false, true]);
    await expect(store.markSeen('b1', 'not_selected')).rejects.toThrow();
    expect(calls).toHaveLength(1);
    await store.markSeen('b1', 'not_selected');
    expect(calls).toHaveLength(2);
    await store.markSeen('b1', 'not_selected');
    expect(calls).toHaveLength(2);
  });

  test('a new sign-in may mark again', async () => {
    const { store, calls } = counting([true, true]);
    await store.markSeen('b1', 'expired');
    store.clear();
    await store.markSeen('b1', 'expired');
    expect(calls).toHaveLength(2);
  });
});

describe('published to the live feed', () => {
  test('only a ready source contributes cards; failed reports an issue with a retry', async () => {
    const { store } = flaky(true);
    const feed = createLiveItems();
    const publish = () => {
      const state = store.getSnapshot();
      if (state.status === 'idle') return;
      feed.setSource(
        'bounties',
        state.rows.map((row) => ({
          id: row.bountyId,
          kind: 'bountyInProgress' as const,
          title: row.title,
          sub: '',
        })),
        state.status,
        store.retry,
      );
    };
    store.subscribe(publish);
    await store.ensureLoaded(USER);
    expect(feed.getSnapshot().issues).toEqual([{ source: 'bounties', status: 'failed' }]);
    expect(feed.getSnapshot().accessory).toHaveLength(0);
    feed.retry('bounties');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(feed.getSnapshot().issues).toEqual([]);
    expect(feed.getSnapshot().accessory).toHaveLength(2);
  });
});

describe('fixture rows that change on a later load', () => {
  test('the same card shows the next state from the second load on', async () => {
    const service = createFixtureLiveService({
      rows: ['posterOpen'],
      next: ['posterApplicants'],
      failFirstLoad: false,
      now: () => NOW,
    });
    const first = await service.list();
    const second = await service.list();
    expect(first.map((row) => [row.bountyId, row.applicantCount ?? 0])).toEqual([
      [fixtureLiveBountyId('posterOpen'), 0],
    ]);
    expect(second.map((row) => row.bountyId)).toEqual([fixtureLiveBountyId('posterOpen')]);
    expect(second[0].applicantCount).toBeGreaterThan(0);
  });

  test('loads before the wait keep the first rows, so a launch reload cannot change the card', async () => {
    let at = NOW.getTime();
    const service = createFixtureLiveService({
      rows: ['posterOpen'],
      next: ['posterApplicants'],
      nextAfterMs: 8_000,
      failFirstLoad: false,
      now: () => new Date(at),
    });
    await service.list();
    at += 5_000;
    expect((await service.list())[0].applicantCount ?? 0).toBe(0);
    at += 5_000;
    expect((await service.list())[0].applicantCount).toBeGreaterThan(0);
  });
});

describe('live reloads out of order', () => {
  test('two reloads answering in reverse order keep the newer rows', async () => {
    const service = createFixtureLiveService({
      rows: ['posterApplicants', 'applicantNotSelected'],
      failFirstLoad: false,
      now: () => NOW,
    });
    const all = await service.list();
    const answers: ((rows: typeof all) => void)[] = [];
    const store = createLiveBountyStore({
      ...service,
      list: () => new Promise((resolve) => answers.push(resolve)),
    });
    const first = store.ensureLoaded(USER);
    const second = store.reload(USER);
    answers[1](all.slice(0, 1));
    await second;
    answers[0](all);
    await first;
    expect(rows(store as ReturnType<typeof flaky>['store'])).toEqual([all[0].bountyId]);
  });
});

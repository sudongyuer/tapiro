import { describe, expect, test } from 'bun:test';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createCodeDrafts } from './codeDrafts';
import { createSupabaseCoinsService } from './coinsService';
import { createCoinsStore } from './coinsStore';
import { createFixtureCoinsService, FIXTURE_FRIEND_CODE } from './fixtureCoinsService';
import { groupByMonth, signedDelta } from './history';
import { inviteCodeShaped, normalizeInviteCode, toHistoryPage, toInvite } from './parse';
import type { CoinRow, CoinsService, FeedResult, Invite, RedeemResult } from './types';

const ME = 'me';
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function memorySettings() {
  const values: Record<string, unknown> = {};
  return {
    values,
    get: (key: string) => values[key],
    set: (next: Record<string, unknown>) => Object.assign(values, next),
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}

const unexpected = (name: string) => () => Promise.reject(new Error(`unexpected ${name}`));

function setup(overrides: Partial<CoinsService> = {}) {
  const service: CoinsService = {
    balance: unexpected('balance'),
    history: unexpected('history'),
    feedStatus: unexpected('feedStatus'),
    feed: unexpected('feed'),
    invite: unexpected('invite'),
    redeem: unexpected('redeem'),
    ...overrides,
  };
  const drafts = createCodeDrafts(memorySettings());
  const store = createCoinsStore({ service, drafts });
  store.start(ME);
  return { store, drafts };
}

const BALANCE = {
  coins: 12,
  freePostsLeft: 2,
  freePostsPerMonth: 3,
  nextFreeAt: '2026-11-30T16:00:00Z',
};

const row = (id: number, month: string, reason = 'weekly_feed', delta = 1) => ({
  id,
  reason,
  delta,
  at: `${month}-03T04:00:00+00:00`,
  month,
  item: null,
});

const INVITE: Invite = {
  code: 'M8WQ4K',
  reward: 3,
  redeemed: null,
  canRedeem: true,
  invited: [],
};

describe('parsing', () => {
  test('history rows keep their month; an unknown reason reads as other instead of failing the page', () => {
    const page = toHistoryPage({
      items: [row(3, '2026-11'), row(2, '2026-10', 'gift_from_future')],
      hasMore: true,
      nextCursor: 2,
    });
    expect(page.items.map((item) => item.reason)).toEqual(['weekly_feed', 'other']);
    expect(page.nextCursor).toBe(2);
    expect(() => toHistoryPage({ items: [row(1, '2026-13')], hasMore: false })).toThrow();
    expect(() => toHistoryPage(null)).toThrow();
  });

  test('an invite answer may carry no code yet but never a code outside the alphabet', () => {
    expect(toInvite({ ...INVITE, code: null }).code).toBeNull();
    expect(() => toInvite({ ...INVITE, code: 'O0I1AB' })).toThrow();
  });

  test('typed codes ignore case, spaces and hyphens like the server', () => {
    expect(normalizeInviteCode(' 7kq-3xp ')).toBe('7KQ3XP');
    expect(inviteCodeShaped('7kq 3xp')).toBe(true);
    expect(inviteCodeShaped('7KQ3X')).toBe(false);
    expect(inviteCodeShaped('7KQ3X0')).toBe(false);
  });

  test('history groups by month in order and deltas carry a sign', () => {
    const rows = [row(4, '2026-11'), row(3, '2026-11'), row(2, '2026-10')] as CoinRow[];
    expect(groupByMonth(rows).map((group) => [group.month, group.rows.length])).toEqual([
      ['2026-11', 2],
      ['2026-10', 1],
    ]);
    expect(groupByMonth([])).toEqual([]);
    expect([signedDelta(3), signedDelta(-1)]).toEqual(['+3', '−1']);
  });
});

describe('coins store', () => {
  test('a failed balance is failed, never 0, and a failed reload keeps the last balance as stale', async () => {
    let fail = true;
    const { store } = setup({
      balance: () => (fail ? Promise.reject(new Error('x')) : Promise.resolve(BALANCE)),
    });
    store.loadBalance();
    await settle();
    expect(store.getSnapshot().balance).toEqual({ status: 'failed', data: null });
    fail = false;
    await store.reloadBalance();
    fail = true;
    await store.reloadBalance();
    expect(store.getSnapshot().balance).toEqual({ status: 'stale', data: BALANCE });
  });

  test('feeding shows the answer only after the server confirms and updates the balance', async () => {
    const answer = deferred<FeedResult>();
    const { store } = setup({ balance: async () => BALANCE, feed: () => answer.promise });
    store.loadBalance();
    await settle();
    const done = store.feed();
    expect(store.getSnapshot().feed).toEqual({ phase: 'sending' });
    expect(await store.feed()).toBeNull();
    answer.resolve({
      status: 'fed',
      fedThisWeek: true,
      nextWeekAt: '2026-11-08T16:00:00Z',
      coins: 13,
    });
    expect(await done).toBe('fed');
    expect(store.getSnapshot().feed).toEqual({ phase: 'answered', status: 'fed' });
    const balance = store.getSnapshot().balance;
    expect(balance.status !== 'idle' && balance.data?.coins).toBe(13);
  });

  test('a failed feed says so and is not retried by itself', async () => {
    let calls = 0;
    const { store } = setup({
      feed: () => {
        calls += 1;
        return Promise.reject(new Error('x'));
      },
    });
    expect(await store.feed()).toBeNull();
    await settle();
    expect(store.getSnapshot().feed).toEqual({ phase: 'failed' });
    expect(calls).toBe(1);
  });

  test('a balance read in flight during a feed cannot bring back the old count', async () => {
    const read = deferred<typeof BALANCE>();
    let reads = 0;
    const { store } = setup({
      balance: () => {
        reads += 1;
        if (reads === 1) return Promise.resolve(BALANCE);
        if (reads === 2) return read.promise;
        return Promise.resolve({ ...BALANCE, coins: 13, freePostsLeft: 1 });
      },
      feed: async () => ({
        status: 'fed',
        fedThisWeek: true,
        nextWeekAt: '2026-11-08T16:00:00Z',
        coins: 13,
      }),
    });
    store.loadBalance();
    await settle();
    void store.reloadBalance();
    await store.feed();
    read.resolve(BALANCE);
    await settle();
    const balance = store.getSnapshot().balance;
    expect(balance.status !== 'idle' && balance.data).toEqual({
      ...BALANCE,
      coins: 13,
      freePostsLeft: 1,
    });
    expect(reads).toBe(3);
  });

  test('the typed code is stored before the call, kept after a refusal and cleared after success', async () => {
    const answers: RedeemResult[] = [
      { ok: false, failure: 'notFound' },
      { ok: true, invite: { ...INVITE, canRedeem: false } },
    ];
    const { store, drafts } = setup({ redeem: async () => answers.shift()! });
    expect(await store.redeem('7kq3xq')).toBe(false);
    expect(store.getSnapshot().redeem).toEqual({ phase: 'failed', failure: 'notFound' });
    expect(drafts.get(ME)).toBe('7kq3xq');
    expect(await store.redeem('7kq3xp')).toBe(true);
    expect(drafts.get(ME)).toBe('');
    const invite = store.getSnapshot().invite;
    expect(invite.status !== 'idle' && invite.data?.canRedeem).toBe(false);
  });

  test('history on screen reads again on new coins; off screen it goes stale', async () => {
    let reads = 0;
    const { store } = setup({
      balance: async () => BALANCE,
      history: async () => {
        reads += 1;
        return { items: [], hasMore: false, nextCursor: null };
      },
    });
    const close = store.open('history');
    await settle();
    store.onCoinsChanged();
    await settle();
    expect(reads).toBe(2);
    expect(store.getSnapshot().history.status).toBe('ready');
    close();
    store.onCoinsChanged();
    expect(store.getSnapshot().history.status).toBe('stale');
    store.open('history');
    await settle();
    expect(reads).toBe(3);
  });

  test('history marked stale by new coins reads again when the page opens', async () => {
    let reads = 0;
    const { store } = setup({
      balance: async () => BALANCE,
      history: async () => {
        reads += 1;
        return { items: [], hasMore: false, nextCursor: null };
      },
    });
    store.loadHistory();
    await settle();
    store.onCoinsChanged();
    expect(store.getSnapshot().history.status).toBe('stale');
    store.loadHistory();
    await settle();
    expect(reads).toBe(2);
    expect(store.getSnapshot().history.status).toBe('ready');
  });
});

describe('coins services', () => {
  test('redeem maps every refusal and refuses a malformed code without a call', async () => {
    const calls: unknown[] = [];
    const respond = (message: string) =>
      createSupabaseCoinsService({
        rpc: async (name: string, args: unknown) => {
          calls.push({ name, args });
          return { data: null, error: { message } };
        },
      } as unknown as SupabaseClient);
    for (const [message, failure] of [
      ['code_not_found', 'notFound'],
      ['own_code', 'ownCode'],
      ['already_redeemed', 'alreadyRedeemed'],
      ['too_late', 'tooLate'],
      ['mutual_invite', 'mutual'],
      ['boom', 'failed'],
    ] as const) {
      expect(await respond(message).redeem('7kq-3xp')).toEqual({ ok: false, failure });
    }
    expect(calls[0]).toEqual({ name: 'redeem_invite', args: { code: '7KQ3XP' } });
    const before = calls.length;
    expect(await respond('x').redeem('abc')).toEqual({ ok: false, failure: 'malformed' });
    expect(calls).toHaveLength(before);
  });

  test('the fixture feeds once a week and takes the friend code once', async () => {
    const service = createFixtureCoinsService({ variant: 'empty' });
    expect((await service.feed()).status).toBe('fed');
    expect((await service.feed()).status).toBe('already_fed');
    expect((await service.history(null)).items.map((item) => item.reason)).toEqual(['weekly_feed']);
    expect(await service.redeem('AAAAAA')).toEqual({ ok: false, failure: 'notFound' });
    expect((await service.redeem(FIXTURE_FRIEND_CODE)).ok).toBe(true);
    expect(await service.redeem('M8WQ4K')).toEqual({ ok: false, failure: 'alreadyRedeemed' });
  });

  test('the worst-case history pages without repeats', async () => {
    const service = createFixtureCoinsService({ variant: 'worst' });
    const ids: number[] = [];
    let cursor: number | null = null;
    do {
      const page = await service.history(cursor);
      ids.push(...page.items.map((item) => item.id));
      cursor = page.nextCursor;
    } while (cursor !== null);
    expect(ids.length).toBe(129);
    expect(new Set(ids).size).toBe(129);
  });
});

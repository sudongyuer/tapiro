import { describe, expect, test } from 'bun:test';
import { createInstance } from 'i18next';

import { resources } from '@/lib/i18n/resources';
import { ACCESSORY_KINDS, accessoryPriority, createLiveItems } from '@/lib/liveItems';

import { settledItem, toSettledRow, type CollectResult, type SettledRow } from './settled';
import { createFixtureSettledService, settledFixture, SETTLED_FIXTURES } from './settledFixture';
import { createSettledStore } from './settledStore';
import { WORST_NAME, WORST_TITLE } from './worstCase';

const USER = 'user-1';

const i18n = createInstance();
i18n.init({ resources, lng: 'zh-Hans', initAsync: false, interpolation: { escapeValue: false } });
const t = i18n.t;

const JSON_ROW = {
  stickerId: 's1',
  paymentId: 'p1',
  itemKind: 'bounty',
  category: 'buy',
  title: '帮买奶茶',
  earnedAt: '2026-10-29T04:00:00Z',
  counterpartName: 'Lily',
  amount: { minor: 3000, currency: 'CNY' },
};

const row = (stickerId: string, overrides: Partial<SettledRow> = {}): SettledRow => ({
  ...toSettledRow({ ...JSON_ROW, stickerId, paymentId: `p-${stickerId}` }),
  ...overrides,
});

function scriptedService(list: () => SettledRow[]) {
  const calls: string[] = [];
  let answer: CollectResult = 'collected';
  return {
    calls,
    answer: (next: CollectResult) => {
      answer = next;
    },
    service: {
      list: async () => list(),
      async collect(stickerId: string) {
        calls.push(stickerId);
        return answer;
      },
    },
  };
}

const shownIds = (store: ReturnType<typeof createSettledStore>) => {
  const state = store.getSnapshot();
  return state.status === 'idle' ? [] : state.rows.map((item) => item.stickerId);
};

describe('settled card mapping', () => {
  test('a settled_cards row becomes a settled card with the paid amount and the category art', () => {
    const item = settledItem(toSettledRow(JSON_ROW), t);
    expect(item).toMatchObject({
      id: 'settled-s1',
      kind: 'settled',
      title: '帮买奶茶 · 办成了',
      sub: '帮买奶茶 · Lily确认收到了',
      amount: { minor: 3000, currency: 'CNY' },
    });
    expect(item.settled).toEqual({
      kind: 'settled',
      stickerId: 's1',
      paymentId: 'p1',
      art: { kind: 'category', category: 'buy' },
      title: '帮买奶茶',
      counterpart: 'Lily',
      amount: { minor: 3000, currency: 'CNY' },
      line: '帮买奶茶 · Lily确认收到了',
    });
  });

  test('a deleted payee reads as 对方, and a ride carries the car', () => {
    const item = settledItem(
      toSettledRow({ ...JSON_ROW, itemKind: 'ride', category: null, counterpartName: null }),
      t,
    );
    expect(item.sub).toBe('帮买奶茶 · 对方确认收到了');
    expect(item.settled.counterpart).toBeNull();
    expect(item.settled.art).toEqual({ kind: 'car' });
  });

  test('an amount in an unknown currency fails the read rather than showing a wrong sum', () => {
    expect(() => toSettledRow({ ...JSON_ROW, amount: { minor: 3000, currency: 'USD' } })).toThrow();
    expect(() => toSettledRow({ ...JSON_ROW, amount: null })).toThrow();
  });
});

describe('settled ranking (68A)', () => {
  test('the settled card ranks after the cards that need you and before in-progress and 等对方', () => {
    expect(ACCESSORY_KINDS).toEqual([
      'oweMoney',
      'rideSoon',
      'owedToYou',
      'bountyAction',
      'settled',
      'bountyInProgress',
      'waitingConfirm',
    ]);
    const kinds = [...ACCESSORY_KINDS].reverse();
    const ranked = [...kinds].sort((a, b) => accessoryPriority(a) - accessoryPriority(b));
    expect(ranked.indexOf('settled')).toBe(4);
  });

  test('the source publishes its cards into the live feed, and a failed load publishes none', async () => {
    let fail = false;
    const { service } = scriptedService(() => {
      if (fail) throw new Error('offline');
      return [row('a'), row('b')];
    });
    const store = createSettledStore(service);
    const live = createLiveItems();
    store.subscribe(() => {
      const state = store.getSnapshot();
      if (state.status === 'idle') return;
      live.setSource(
        'stickers',
        state.rows.map((item) => settledItem(item, t)),
        state.status,
      );
    });
    await store.ensureLoaded(USER);
    expect(live.getSnapshot().accessory.map((item) => item.id)).toEqual(['settled-a', 'settled-b']);
    fail = true;
    await store.reload(USER);
    expect(live.getSnapshot().accessory).toEqual([]);
    expect(live.getSnapshot().issues).toEqual([{ source: 'stickers', status: 'stale' }]);
  });
});

describe('settled store', () => {
  test('collect writes once and keeps the card until it is dismissed, so the flight can run', async () => {
    const script = scriptedService(() => [row('a'), row('b')]);
    const store = createSettledStore(script.service);
    await store.ensureLoaded(USER);
    expect(await store.collect('a')).toBe('collected');
    expect(await store.collect('a')).toBe('collected');
    expect(script.calls).toEqual(['a']);
    expect(shownIds(store)).toEqual(['a', 'b']);
    store.dismiss('a');
    expect(shownIds(store)).toEqual(['b']);
  });

  test('a failed collect keeps the card hidden this session and retries the mark once on the next load', async () => {
    const script = scriptedService(() => [row('a'), row('b')]);
    const store = createSettledStore(script.service);
    await store.ensureLoaded(USER);
    script.answer('failed');
    expect(await store.collect('a')).toBe('failed');
    store.dismiss('a');
    expect(script.calls).toEqual(['a']);

    await store.reload(USER);
    expect(script.calls).toEqual(['a', 'a']);
    expect(shownIds(store)).toEqual(['b']);

    await store.reload(USER);
    expect(script.calls).toEqual(['a', 'a']);
    expect(shownIds(store)).toEqual(['b']);
  });

  test('a collect that throws counts as failed and is retried once', async () => {
    const calls: string[] = [];
    const store = createSettledStore({
      list: async () => [row('a')],
      async collect(stickerId) {
        calls.push(stickerId);
        throw new Error('offline');
      },
    });
    await store.ensureLoaded(USER);
    expect(await store.collect('a')).toBe('failed');
    await store.reload(USER);
    await store.reload(USER);
    expect(calls).toEqual(['a', 'a']);
    expect(shownIds(store)).toEqual([]);
  });

  test('a sticker the server does not know is not retried', async () => {
    const script = scriptedService(() => [row('a')]);
    const store = createSettledStore(script.service);
    await store.ensureLoaded(USER);
    script.answer('notFound');
    await store.collect('a');
    await store.reload(USER);
    expect(script.calls).toEqual(['a']);
  });

  test('a collect made before the flight lands still keeps the card away after a reload', async () => {
    const script = scriptedService(() => [row('a')]);
    const store = createSettledStore(script.service);
    await store.ensureLoaded(USER);
    script.answer('failed');
    await store.collect('a');
    await store.reload(USER);
    expect(shownIds(store)).toEqual([]);
  });

  test('a failed first load is failed, never empty, and a retry loads it', async () => {
    let fail = true;
    const store = createSettledStore({
      list: async () => {
        if (fail) throw new Error('offline');
        return [row('a')];
      },
      collect: async () => 'collected',
    });
    await store.ensureLoaded(USER);
    expect(store.getSnapshot()).toEqual({ status: 'failed', userId: USER, rows: [] });
    fail = false;
    await store.retry();
    expect(shownIds(store)).toEqual(['a']);
  });

  test('signing out forgets the cards and the session marks', async () => {
    const script = scriptedService(() => [row('a')]);
    const store = createSettledStore(script.service);
    await store.ensureLoaded(USER);
    script.answer('failed');
    await store.collect('a');
    store.follow(null, { addEventListener: () => ({ remove: () => undefined }) });
    expect(store.getSnapshot()).toEqual({ status: 'idle' });
    await store.ensureLoaded(USER);
    expect(script.calls).toEqual(['a']);
    expect(shownIds(store)).toEqual(['a']);
  });
});

describe('settled fixture', () => {
  test('the launch argument picks a variant, and anything else is none', () => {
    expect(SETTLED_FIXTURES).toEqual(['none', 'one', 'two', 'behind', 'worst']);
    expect(settledFixture('two')).toBe('two');
    expect(settledFixture('three')).toBe('none');
    expect(settledFixture(undefined)).toBe('none');
  });

  test('two settles list newest first; worst has three at the limits', async () => {
    const two = await createFixtureSettledService({ fixture: 'two' }).list();
    expect(two.map((item) => item.title)).toEqual(['帮买奶茶', '帮取快递']);
    expect(two[0].earnedAt > two[1].earnedAt).toBe(true);
    const worst = await createFixtureSettledService({ fixture: 'worst' }).list();
    expect(worst).toHaveLength(3);
    expect(worst.every((item) => item.title === WORST_TITLE)).toBe(true);
    expect(worst.map((item) => item.counterpartName)).toEqual([WORST_NAME, null, WORST_NAME]);
    expect(worst.map((item) => item.amount.currency)).toEqual(['MYR', 'CNY', 'MYR']);
  });

  test('a fixture collect removes the card and records every call', async () => {
    const seen: string[][] = [];
    const service = createFixtureSettledService({
      fixture: 'two',
      onCollect: (ids) => seen.push(ids),
    });
    const [first] = await service.list();
    expect(await service.collect(first.stickerId)).toBe('collected');
    expect((await service.list()).map((item) => item.stickerId)).not.toContain(first.stickerId);
    expect(await service.collect('elsewhere')).toBe('notFound');
    expect(seen).toEqual([[first.stickerId]]);
  });
});

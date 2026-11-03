import { describe, expect, test } from 'bun:test';

import { inTimeZone } from '@/lib/inTimeZone';

import { groupByDay, rideListModel } from './listModel';
import { createRideList } from './listState';
import type { RideListData, RideSummary } from './types';

const NOW = Date.parse('2026-11-02T14:07:00Z');

const ride = (id: string, departAt: string) => ({ id, departAt }) as RideSummary;

const data = (patch: Partial<RideListData> = {}): RideListData => ({
  mine: [],
  joinable: [ride('a', '2026-11-02T15:00:00Z')],
  historyCount: 0,
  next: null,
  ...patch,
});

describe('ride list model', () => {
  const rides = [
    ride('a', '2026-11-02T15:00:00Z'),
    ride('b', '2026-11-03T03:00:00Z'),
    ride('c', '2026-11-02T22:00:00Z'),
    ride('d', '2026-11-05T20:00:00Z'),
  ];
  const grouped = (zone: string) =>
    inTimeZone(zone, () =>
      groupByDay(rides, NOW).map((group) => [group.relation, group.rides.map((r) => r.id)]),
    );

  test('joinable rides group under 今天 / 明天 in server order', () => {
    expect(grouped('Asia/Kuala_Lumpur')).toEqual([
      ['today', ['a']],
      ['tomorrow', ['b', 'c']],
      ['other', ['d']],
    ]);
  });

  test('the groups follow the device day, not the day the server sorted by', () => {
    expect(grouped('Europe/London')).toEqual([
      ['today', ['a', 'c']],
      ['tomorrow', ['b']],
      ['other', ['d']],
    ]);
  });

  test('the list is empty only with no mine, no joinable and no history', () => {
    expect(rideListModel(data({ joinable: [] }), NOW).empty).toBe(true);
    expect(rideListModel(data({ joinable: [], historyCount: 1 }), NOW).empty).toBe(false);
    expect(rideListModel(data(), NOW).empty).toBe(false);
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe('ride list state', () => {
  test('a failed first load is a failed card, never an empty list', async () => {
    const list = createRideList({
      load: () => Promise.reject(new Error('offline')),
      more: () => Promise.reject(new Error('unused')),
      now: () => new Date(NOW),
    });
    await list.load();
    expect(list.get()).toEqual({ kind: 'failed', busy: false });
  });

  test('a failed refresh keeps the last tickets and marks them stale with their time', async () => {
    let fail = false;
    const list = createRideList({
      load: () => (fail ? Promise.reject(new Error('offline')) : Promise.resolve(data())),
      more: () => Promise.reject(new Error('unused')),
      now: () => new Date(NOW),
    });
    await list.load();
    fail = true;
    await list.load();
    const state = list.get();
    expect(state.kind === 'ready' && state.stale).toBe(true);
    expect(state.kind === 'ready' && state.data.joinable.map((r) => r.id)).toEqual(['a']);
    expect(state.kind === 'ready' && state.loadedAt).toBe(new Date(NOW).toISOString());
    fail = false;
    await list.load();
    expect(list.get().kind === 'ready' && (list.get() as { stale: boolean }).stale).toBe(false);
  });

  test('a slower earlier load does not overwrite a newer one', async () => {
    const first = deferred<RideListData>();
    const second = deferred<RideListData>();
    const queue = [first, second];
    const list = createRideList({
      load: () => queue.shift()!.promise,
      more: () => Promise.reject(new Error('unused')),
      now: () => new Date(NOW),
    });
    const a = list.load();
    const b = list.load();
    second.resolve(data({ joinable: [ride('new', '2026-11-02')] }));
    await b;
    first.resolve(data({ joinable: [ride('old', '2026-11-02')] }));
    await a;
    const state = list.get();
    expect(state.kind === 'ready' && state.data.joinable[0].id).toBe('new');
  });

  test('more appends the next page without duplicates; a failed page keeps the rows', async () => {
    let fail = false;
    const list = createRideList({
      load: () => Promise.resolve(data({ next: { id: 'a', latitude: null, longitude: null } })),
      more: () =>
        fail
          ? Promise.reject(new Error('offline'))
          : Promise.resolve({
              items: [ride('a', '2026-11-02'), ride('b', '2026-11-03')],
              next: null,
            }),
      now: () => new Date(NOW),
    });
    await list.load();
    fail = true;
    await list.more();
    let state = list.get();
    expect(state.kind === 'ready' && state.page).toBe('failed');
    fail = false;
    await list.more();
    state = list.get();
    expect(state.kind === 'ready' && state.data.joinable.map((r) => r.id)).toEqual(['a', 'b']);
    expect(state.kind === 'ready' && state.data.next).toBeNull();
  });
});

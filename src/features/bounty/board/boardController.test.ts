import { describe, expect, test } from 'bun:test';

import { SUNWAY_PYRAMID } from '@/lib/location/fixtureLocationService';

import { createJustApplied } from '../shared/justApplied';
import { beyondCount } from './axis';
import { createBoardController } from './boardState';
import { AT, ME, NONE, deferredService, ids, mixed, page, ready, settle } from './boardTestKit';
import { createFixtureBoardService, fixtureBoardOptions } from './fixtureBoardService';

describe('controller', () => {
  test('never runs more than one load at a time', async () => {
    const stub = deferredService();
    const board = createBoardController(stub.service, () => new Date(AT));
    void board.setQuery(ME, 'all');
    void board.load();
    void board.load();
    expect(stub.calls).toHaveLength(1);
    stub.pending[0].resolve(page(['a'], { after: 'a' }, 3));
    await settle();
    expect(ids(board.get().state)).toEqual(['a']);
    void board.load();
    expect(board.get().refreshing).toBe(true);
    expect(stub.calls).toHaveLength(2);
  });

  test('rows loaded for one origin are never published beside another origin', async () => {
    const stub = deferredService();
    const board = createBoardController(stub.service, () => new Date(AT));
    void board.setQuery(ME, 'all');
    stub.pending[0].resolve(page(['a']));
    await settle();
    expect(board.get().origin).toEqual(ME);
    const seen: { kind: string; origin: unknown }[] = [];
    const stop = board.subscribe(() =>
      seen.push({ kind: board.get().state.kind, origin: board.get().origin }),
    );
    void board.setQuery(NONE, 'all');
    stop();
    expect(seen[0]).toEqual({ kind: 'loading', origin: NONE });
    expect(seen.every((s) => s.kind !== 'ready' || s.origin === ME)).toBe(true);
  });

  test('a query change during a load reloads once the load answers', async () => {
    const stub = deferredService();
    const board = createBoardController(stub.service, () => new Date(AT));
    void board.setQuery(ME, 'all');
    void board.setQuery(ME, 'urgent');
    void board.setQuery(NONE, 'urgent');
    expect(stub.calls).toHaveLength(1);
    stub.pending[0].resolve(page(['old']));
    await settle();
    expect(board.get().state.kind).toBe('loading');
    expect(stub.calls).toHaveLength(2);
    expect(stub.calls[1]).toEqual({ origin: NONE, filter: 'urgent', after: null });
    stub.pending[1].resolve(page(['new']));
    await settle();
    expect(ids(board.get().state)).toEqual(['new']);
  });

  test('one page request at a time, none while loading, failed pages wait for retry', async () => {
    const stub = deferredService();
    const board = createBoardController(stub.service, () => new Date(AT));
    void board.setQuery(ME, 'all');
    void board.loadMore();
    expect(stub.calls).toHaveLength(1);
    stub.pending[0].resolve(page(['a'], { after: 'a' }));
    await settle();
    void board.loadMore();
    void board.loadMore();
    expect(stub.calls).toHaveLength(2);
    expect(stub.calls[1].after).toEqual({ after: 'a' });
    stub.pending[1].reject(new TypeError('Network request failed'));
    await settle();
    expect(ready(board.get().state).page).toBe('failed');
    void board.loadMore();
    expect(stub.calls).toHaveLength(2);
    void board.retryPage();
    expect(stub.calls).toHaveLength(3);
    stub.pending[2].resolve(page(['b']));
    await settle();
    expect(ids(board.get().state)).toEqual(['a', 'b']);
  });

  test('a load error after a first load keeps the rows', async () => {
    const stub = deferredService();
    const board = createBoardController(stub.service, () => new Date(AT));
    void board.setQuery(ME, 'all');
    stub.pending[0].resolve(page(['a']));
    await settle();
    void board.load();
    stub.pending[1].reject(new TypeError('Network request failed'));
    await settle();
    expect(ready(board.get().state)).toMatchObject({ refreshFailed: true, loadedAt: AT });
    expect(board.get().refreshing).toBe(false);
  });

  test('refresh reloads the same query and switches to a new origin', async () => {
    const stub = deferredService();
    const board = createBoardController(stub.service, () => new Date(AT));
    void board.setQuery(ME, 'all');
    stub.pending[0].resolve(page(['a']));
    await settle();
    void board.refreshFrom(async () => ME);
    await settle();
    expect(stub.calls).toHaveLength(2);
    stub.pending[1].resolve(page(['a']));
    await settle();
    void board.refreshFrom(async () => NONE);
    await settle();
    expect(stub.calls[2]).toEqual({ origin: NONE, filter: 'all', after: null });
    expect(board.get().state.kind).toBe('loading');
  });

  test("a refresh during a running load resolves only with that load's outcome", async () => {
    const stub = deferredService();
    const board = createBoardController(stub.service, () => new Date(AT));
    void board.setQuery(ME, 'all');
    stub.pending[0].resolve(page(['a']));
    await settle();
    void board.load();
    let done = false;
    void board
      .refreshFrom(async () => ME)
      .then(() => {
        done = true;
      });
    await settle();
    expect(stub.calls).toHaveLength(2);
    expect(done).toBe(false);
    stub.pending[1].reject(new TypeError('Network request failed'));
    await settle();
    expect(done).toBe(true);
    expect(ready(board.get().state).refreshFailed).toBe(true);
  });

  test('a load waits for the reload a query change queued', async () => {
    const stub = deferredService();
    const board = createBoardController(stub.service, () => new Date(AT));
    let done = false;
    void board.setQuery(ME, 'all').then(() => {
      done = true;
    });
    void board.setQuery(ME, 'urgent');
    stub.pending[0].resolve(page(['old']));
    await settle();
    expect(done).toBe(false);
    stub.pending[1].resolve(page(['new']));
    await settle();
    expect(done).toBe(true);
    expect(ids(board.get().state)).toEqual(['new']);
  });

  test('a query change at any moment after the load answers is not dropped', async () => {
    for (let ticks = 0; ticks < 6; ticks += 1) {
      const stub = deferredService();
      const board = createBoardController(stub.service, () => new Date(AT));
      void board.setQuery(ME, 'all');
      stub.pending[0].resolve(page(['old']));
      for (let tick = 0; tick < ticks; tick += 1) await Promise.resolve();
      void board.setQuery(ME, 'urgent');
      await settle();
      expect(stub.calls.at(-1)).toEqual({ origin: ME, filter: 'urgent', after: null });
    }
  });

  test('setting the same query again does not reload', async () => {
    const stub = deferredService();
    const board = createBoardController(stub.service, () => new Date(AT));
    void board.setQuery(ME, 'all');
    stub.pending[0].resolve(page(['a']));
    await settle();
    void board.setQuery({ kind: 'me', point: { ...ME.point } }, 'all');
    expect(stub.calls).toHaveLength(1);
  });
});

describe('blocking a poster', () => {
  test('the reload after a block restores both counts', async () => {
    const stub = deferredService();
    const board = createBoardController(stub.service, () => new Date(AT));
    void board.setQuery(ME, 'all');
    stub.pending[0].resolve(
      mixed(
        [
          ['a', 'lin'],
          ['b', 'jie'],
        ],
        2,
      ),
    );
    await settle();
    void board.blocked('lin');
    expect(ready(board.get().state)).toMatchObject({ total: null, beyondTotal: null });
    stub.pending[1].resolve(mixed([['b', 'jie']], 1));
    await settle();
    expect(ready(board.get().state)).toMatchObject({ total: 1, beyondTotal: 1 });
  });

  test('a load that started before the block cannot bring the rows back, and a fresh load runs', async () => {
    const stub = deferredService();
    const board = createBoardController(stub.service, () => new Date(AT));
    void board.setQuery(ME, 'all');
    stub.pending[0].resolve(
      mixed([
        ['a', 'lin'],
        ['b', 'jie'],
      ]),
    );
    await settle();
    void board.load();
    expect(stub.calls).toHaveLength(2);
    void board.blocked('lin');
    expect(ids(board.get().state)).toEqual(['b']);
    stub.pending[1].resolve(
      mixed([
        ['a', 'lin'],
        ['b', 'jie'],
      ]),
    );
    await settle();
    expect(ids(board.get().state)).toEqual(['b']);
    expect(stub.calls).toHaveLength(3);
    stub.pending[2].resolve(mixed([['b', 'jie']]));
    await settle();
    expect(ids(board.get().state)).toEqual(['b']);
  });
});

describe('the 45-row worst board', () => {
  test('the first page reads the exact count of farther bounties', async () => {
    const service = createFixtureBoardService({
      ...fixtureBoardOptions(
        () => undefined,
        'demo',
        () => new Date(AT),
      ),
      board: 'worst',
    });
    const board = createBoardController(service, () => new Date(AT));
    await board.setQuery({ kind: 'me', point: SUNWAY_PYRAMID }, 'all');
    const state = ready(board.get().state);
    expect(state.next).not.toBeNull();
    expect(beyondCount(state)).toBe(42);
    while (ready(board.get().state).next !== null) await board.loadMore();
    const rows = ready(board.get().state).rows;
    expect(rows.filter((row) => row.distanceM !== null && row.distanceM > 2000)).toHaveLength(42);
  });
});

describe('a pull that waits for the origin', () => {
  test('a filter chosen while the origin resolves stays applied', async () => {
    const stub = deferredService();
    const board = createBoardController(stub.service, () => new Date(AT));
    void board.setQuery(ME, 'all');
    stub.pending[0].resolve(page(['a', 'b']));
    await settle();
    let origin!: (value: typeof ME) => void;
    const pulled = board.refreshFrom(() => new Promise((resolve) => (origin = resolve)));
    void board.setQuery(ME, 'urgent');
    stub.pending[1].resolve(page(['b']));
    await settle();
    origin(ME);
    await settle();
    expect(stub.calls.at(-1)).toEqual({ origin: ME, filter: 'urgent', after: null });
    stub.pending.at(-1)?.resolve(page(['b']));
    await pulled;
    expect(stub.calls.every((call, i) => i === 0 || call.filter === 'urgent')).toBe(true);
    expect(ids(board.get().state)).toEqual(['b']);
  });
});

describe('stamps waiting for a card', () => {
  test('a block drops the stamps of that poster’s cards', async () => {
    const stub = deferredService();
    const stamps = createJustApplied();
    const board = createBoardController(stub.service, () => new Date(AT), stamps);
    void board.setQuery(ME, 'all');
    stub.pending[0].resolve(
      mixed([
        ['a', 'lin'],
        ['b', 'jie'],
      ]),
    );
    await settle();
    stamps.set('a', 'detail');
    stamps.set('b', 'card');
    stamps.sheetGone();
    void board.blocked('lin');
    expect(stamps.entry('a', 'detail')).toBe('none');
    expect(stamps.entry('b', 'card')).toBe('ready');
  });

  test('a reload that no longer lists the card drops its stamp', async () => {
    const stub = deferredService();
    const stamps = createJustApplied();
    const board = createBoardController(stub.service, () => new Date(AT), stamps);
    void board.setQuery(ME, 'all');
    stub.pending[0].resolve(page(['a', 'b']));
    await settle();
    stamps.set('a', 'card');
    stamps.set('b', 'card');
    stamps.sheetGone();
    void board.setQuery(ME, 'urgent');
    stub.pending[1].resolve(page(['b']));
    await settle();
    expect(stamps.entry('a', 'card')).toBe('none');
    expect(stamps.entry('b', 'card')).toBe('ready');
  });
});

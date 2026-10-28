import { describe, expect, test } from 'bun:test';

import {
  INITIAL_BOARD,
  boardReducer,
  boardTotal,
  createBoardController,
  nearEnd,
  type BoardEvent,
} from './boardState';
import type { BoardOrigin, BoardPage, BoardRow, BoardState } from './types';

const row = (id: string, patch: Partial<BoardRow> = {}): BoardRow => ({
  id,
  title: `title ${id}`,
  category: 'pickup',
  rewardSen: 800,
  placeLabel: null,
  stickerPath: null,
  startsAt: null,
  endsAt: null,
  deadlineAt: null,
  urgent: false,
  distanceM: null,
  appliedByMe: false,
  createdAt: '2026-10-27T03:00:00.000Z',
  poster: { id: 'poster', name: '小林', tier: 'reliable' },
  ...patch,
});

const page = (ids: string[], next: unknown | null = null, total?: number): BoardPage => ({
  items: ids.map((id) => row(id)),
  next,
  ...(total === undefined ? {} : { total }),
});

const AT = '2026-10-27T04:00:00.000Z';
const LATER = '2026-10-27T04:05:00.000Z';

function run(events: (BoardEvent | ((state: BoardState) => BoardEvent))[]) {
  return events.reduce<BoardState>(
    (state, event) => boardReducer(state, typeof event === 'function' ? event(state) : event),
    INITIAL_BOARD,
  );
}

const succeed =
  (answer: BoardPage, at = AT) =>
  (state: BoardState): BoardEvent => ({
    type: 'loadSucceeded',
    page: answer,
    at,
    generation: state.generation,
  });
const fail = (state: BoardState): BoardEvent => ({
  type: 'loadFailed',
  generation: state.generation,
});
const pageAnswer =
  (answer: BoardPage) =>
  (state: BoardState): BoardEvent => ({
    type: 'pageSucceeded',
    page: answer,
    at: LATER,
    generation: state.generation,
  });

const ids = (state: BoardState) =>
  state.kind === 'ready' ? state.rows.map((item) => item.id) : null;

const ready = (state: BoardState) => {
  if (state.kind !== 'ready') throw new Error(`expected ready, got ${state.kind}`);
  return state;
};

describe('first load', () => {
  test('a failed first load shows no rows and no count', () => {
    const state = run([{ type: 'loadStarted' }, fail]);
    expect(state.kind).toBe('failed');
    expect(ids(state)).toBeNull();
    expect(boardTotal(state)).toBeNull();
  });

  test('retry after a failure loads the rows', () => {
    const state = run([
      { type: 'loadStarted' },
      fail,
      { type: 'loadStarted' },
      succeed(page(['a', 'b'], null, 2)),
    ]);
    expect(ready(state)).toMatchObject({ total: 2, loadedAt: AT, refreshFailed: false });
    expect(ids(state)).toEqual(['a', 'b']);
  });

  test('a page without total reads as no count', () => {
    const state = run([{ type: 'loadStarted' }, succeed(page(['a']))]);
    expect(boardTotal(state)).toBeNull();
  });
});

describe('refresh', () => {
  const loaded = [{ type: 'loadStarted' } as const, succeed(page(['a', 'b'], { c: 1 }, 5))];

  test('a failed refresh keeps the rows and the old time and flags the failure', () => {
    const state = ready(run([...loaded, { type: 'loadStarted' }, fail]));
    expect(state.rows.map((item) => item.id)).toEqual(['a', 'b']);
    expect(state.refreshFailed).toBe(true);
    expect(state.loadedAt).toBe(AT);
    expect(state.total).toBe(5);
  });

  test('a successful refresh clears the failure and replaces the rows', () => {
    const state = ready(
      run([
        ...loaded,
        { type: 'loadStarted' },
        fail,
        { type: 'loadStarted' },
        succeed(page(['c'], null, 1), LATER),
      ]),
    );
    expect(state.rows.map((item) => item.id)).toEqual(['c']);
    expect(state).toMatchObject({ refreshFailed: false, loadedAt: LATER, total: 1, next: null });
  });
});

describe('pages', () => {
  const loaded = [{ type: 'loadStarted' } as const, succeed(page(['a', 'b'], { after: 'b' }, 4))];

  test('page loading and failure leave the rows untouched', () => {
    const before = ready(run(loaded));
    const loading = ready(boardReducer(before, { type: 'pageStarted' }));
    expect(loading.page).toBe('loading');
    expect(loading.rows).toBe(before.rows);
    const failed = ready(
      boardReducer(loading, { type: 'pageFailed', generation: loading.generation }),
    );
    expect(failed.page).toBe('failed');
    expect(failed.rows).toBe(before.rows);
    expect(failed.next).toEqual({ after: 'b' });
  });

  test('a page appends rows and drops ids already on the board', () => {
    const state = ready(
      run([...loaded, { type: 'pageStarted' }, pageAnswer(page(['b', 'c', 'c', 'd'], null))]),
    );
    expect(state.rows.map((item) => item.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(state).toMatchObject({ page: 'idle', next: null, total: 4, loadedAt: AT });
  });

  test('a restarted page replaces the rows', () => {
    const state = ready(
      run([
        ...loaded,
        { type: 'pageStarted' },
        pageAnswer({ ...page(['x', 'a'], { after: 'a' }, 7), restarted: true }),
      ]),
    );
    expect(state.rows.map((item) => item.id)).toEqual(['x', 'a']);
    expect(state).toMatchObject({ total: 7, loadedAt: LATER, page: 'idle' });
  });

  test.each(['originChanged', 'filterChanged'] as const)(
    'a page answer after %s is dropped',
    (change) => {
      const loadedState = run(loaded);
      const started = boardReducer(loadedState, { type: 'pageStarted' });
      const changed = boardReducer(started, { type: change });
      expect(changed.kind).toBe('loading');
      const answered = boardReducer(changed, {
        type: 'pageSucceeded',
        page: page(['z']),
        at: LATER,
        generation: started.generation,
      });
      expect(answered).toBe(changed);
      const loadAnswer = boardReducer(changed, {
        type: 'loadSucceeded',
        page: page(['z']),
        at: LATER,
        generation: started.generation,
      });
      expect(loadAnswer).toBe(changed);
    },
  );

  test('a page answer from before a refresh is dropped', () => {
    const started = boardReducer(run(loaded), { type: 'pageStarted' });
    const refreshing = boardReducer(started, { type: 'loadStarted' });
    const answered = boardReducer(refreshing, {
      type: 'pageSucceeded',
      page: page(['z']),
      at: LATER,
      generation: started.generation,
    });
    expect(ids(answered)).toEqual(['a', 'b']);
    expect(ready(answered).page).toBe('idle');
  });
});

describe('applied and withdrawn', () => {
  test('flip appliedByMe on that row only', () => {
    const loaded = run([{ type: 'loadStarted' }, succeed(page(['a', 'b']))]);
    const applied = ready(boardReducer(loaded, { type: 'applied', id: 'b' }));
    expect(applied.rows.map((item) => item.appliedByMe)).toEqual([false, true]);
    expect(applied.rows[0]).toBe(ready(loaded).rows[0]);
    const withdrawn = ready(boardReducer(applied, { type: 'withdrawn', id: 'b' }));
    expect(withdrawn.rows.map((item) => item.appliedByMe)).toEqual([false, false]);
  });
});

describe('local writes over load answers', () => {
  const loaded = [{ type: 'loadStarted' } as const, succeed(page(['a', 'b']))];

  test('a load that started before an apply does not undo it; a later load decides', () => {
    const inFlight = run([...loaded, { type: 'loadStarted' }]);
    const applied = boardReducer(inFlight, { type: 'applied', id: 'b' });
    const stale = ready(boardReducer(applied, succeed(page(['a', 'b']))(applied)));
    expect(stale.rows.map((item) => item.appliedByMe)).toEqual([false, true]);
    const later = boardReducer(stale, { type: 'loadStarted' });
    const answered = ready(boardReducer(later, succeed(page(['a', 'b']))(later)));
    expect(answered.rows.map((item) => item.appliedByMe)).toEqual([false, false]);
  });

  test('a withdraw survives an older load answer and covers rows from later pages', () => {
    const appliedRows: BoardPage = {
      items: [row('a'), row('b', { appliedByMe: true })],
      next: { after: 'b' },
    };
    const inFlight = run([{ type: 'loadStarted' }, succeed(appliedRows), { type: 'loadStarted' }]);
    const withdrawn = boardReducer(boardReducer(inFlight, { type: 'withdrawn', id: 'b' }), {
      type: 'withdrawn',
      id: 'c',
    });
    const stale = ready(boardReducer(withdrawn, succeed(appliedRows)(withdrawn)));
    expect(stale.rows.map((item) => item.appliedByMe)).toEqual([false, false]);
    const started = boardReducer(stale, { type: 'pageStarted' });
    const paged = ready(
      boardReducer(
        started,
        pageAnswer({ items: [row('c', { appliedByMe: true })], next: null })(started),
      ),
    );
    expect(paged.rows.find((item) => item.id === 'c')?.appliedByMe).toBe(false);
  });
});

test('nearEnd: within one screen of the viewport', () => {
  expect(nearEnd(2000, 1000, 800)).toBe(false);
  expect(nearEnd(1800, 1000, 800)).toBe(true);
  expect(nearEnd(900, 1000, 800)).toBe(true);
});

const ME: BoardOrigin = { kind: 'me', point: { latitude: 3.0733, longitude: 101.6078 } };
const NONE: BoardOrigin = { kind: 'none', reason: 'denied' };

function deferredService() {
  const calls: { origin: BoardOrigin; filter: string; after: unknown }[] = [];
  const pending: { resolve(page: BoardPage): void; reject(error: unknown): void }[] = [];
  return {
    calls,
    pending,
    service: {
      page(origin: BoardOrigin, filter: string, after: unknown) {
        calls.push({ origin, filter, after });
        return new Promise<BoardPage>((resolve, reject) => pending.push({ resolve, reject }));
      },
    },
  };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

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
    void board.refresh(ME, 'all');
    expect(stub.calls).toHaveLength(2);
    stub.pending[1].resolve(page(['a']));
    await settle();
    void board.refresh(NONE, 'all');
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
    void board.refresh(ME, 'all').then(() => {
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

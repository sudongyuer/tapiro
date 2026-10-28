import { describe, expect, test } from 'bun:test';

import {
  INITIAL_BOARD,
  boardBody,
  boardReducer,
  boardTotal,
  nearEnd,
  type BoardEvent,
} from './boardState';
import { AT, LATER, ids, mixed, page, ready, row } from './boardTestKit';
import type { BoardPage, BoardState } from './types';

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
        pageAnswer({ ...page(['x', 'a'], { after: 'a' }, 7, 5), restarted: true }),
      ]),
    );
    expect(state.rows.map((item) => item.id)).toEqual(['x', 'a']);
    expect(state).toMatchObject({ total: 7, beyondTotal: 5, loadedAt: LATER, page: 'idle' });
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

describe('blocking a poster', () => {
  test('removes that poster’s rows at once and hides the count until the reload answers', () => {
    const state = run([
      { type: 'loadStarted' },
      succeed(
        mixed(
          [
            ['a', 'lin'],
            ['b', 'jie'],
            ['c', 'lin'],
          ],
          3,
        ),
      ),
      { type: 'blocked', posterId: 'lin' },
    ]);
    expect(ids(state)).toEqual(['b']);
    expect(boardTotal(state)).toBeNull();
    expect(ready(state).beyondTotal).toBeNull();
  });
});

describe('what the board body shows', () => {
  const blockedOut = (next: unknown | null) =>
    run([
      { type: 'loadStarted' },
      succeed({ ...mixed([['a', 'lin']], 1), next }),
      { type: 'blocked', posterId: 'lin' },
    ]);

  test('a block that empties the rows reads as loading while the reload runs', () => {
    expect(boardBody(blockedOut(null), true)).toBe('loading');
  });

  test('a block that empties the rows reads as loading while more pages exist', () => {
    expect(boardBody(blockedOut({ after: 'a' }), false)).toBe('loading');
  });

  test('empty only once the reload or the last page says so', () => {
    expect(boardBody(blockedOut(null), false)).toBe('empty');
    const empty = run([{ type: 'loadStarted' }, succeed(page([], null, 0))]);
    expect(boardBody(empty, true)).toBe('empty');
    expect(boardBody(run([{ type: 'loadStarted' }, succeed(page(['a']))]), false)).toBe('rows');
  });
});

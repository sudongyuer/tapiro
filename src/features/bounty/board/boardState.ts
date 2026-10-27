import type {
  BoardFilter,
  BoardOrigin,
  BoardPage,
  BoardRow,
  BoardService,
  BoardState,
} from './types';

export type BoardEvent =
  | { type: 'loadStarted' }
  | { type: 'loadSucceeded'; page: BoardPage; at: string; generation: number }
  | { type: 'loadFailed'; generation: number }
  | { type: 'pageStarted' }
  | { type: 'pageSucceeded'; page: BoardPage; at: string; generation: number }
  | { type: 'pageFailed'; generation: number }
  | { type: 'applied'; id: string }
  | { type: 'withdrawn'; id: string }
  | { type: 'originChanged' }
  | { type: 'filterChanged' };

export const INITIAL_BOARD: BoardState = { kind: 'loading', generation: 0 };

function unique(rows: BoardRow[], seen = new Set<string>()) {
  return rows.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

function fresh(page: BoardPage, at: string, generation: number): BoardState {
  return {
    kind: 'ready',
    generation,
    rows: unique(page.items),
    total: page.total ?? null,
    next: page.next,
    loadedAt: at,
    refreshFailed: false,
    page: 'idle',
  };
}

function withApplied(state: BoardState, id: string, appliedByMe: boolean): BoardState {
  if (state.kind !== 'ready') return state;
  return {
    ...state,
    rows: state.rows.map((row) => (row.id === id ? { ...row, appliedByMe } : row)),
  };
}

export function boardReducer(state: BoardState, event: BoardEvent): BoardState {
  switch (event.type) {
    case 'originChanged':
    case 'filterChanged':
      return { kind: 'loading', generation: state.generation + 1 };
    case 'loadStarted':
      return state.kind === 'ready'
        ? { ...state, generation: state.generation + 1, page: 'idle' }
        : { kind: 'loading', generation: state.generation + 1 };
    case 'applied':
      return withApplied(state, event.id, true);
    case 'withdrawn':
      return withApplied(state, event.id, false);
    case 'pageStarted':
      return state.kind === 'ready' && state.next !== null && state.page !== 'loading'
        ? { ...state, page: 'loading' }
        : state;
  }
  if (event.generation !== state.generation) return state;
  switch (event.type) {
    case 'loadSucceeded':
      return fresh(event.page, event.at, state.generation);
    case 'loadFailed':
      return state.kind === 'ready'
        ? { ...state, refreshFailed: true }
        : { kind: 'failed', generation: state.generation };
    case 'pageSucceeded':
      if (state.kind !== 'ready') return state;
      if (event.page.restarted) {
        const restarted = fresh(event.page, event.at, state.generation);
        return restarted.kind === 'ready' && event.page.total === undefined
          ? { ...restarted, total: state.total }
          : restarted;
      }
      return {
        ...state,
        rows: [
          ...state.rows,
          ...unique(event.page.items, new Set(state.rows.map((row) => row.id))),
        ],
        next: event.page.next,
        page: 'idle',
      };
    case 'pageFailed':
      return state.kind === 'ready' ? { ...state, page: 'failed' } : state;
  }
}

export function boardTotal(state: BoardState): number | null {
  return state.kind === 'ready' ? state.total : null;
}

export function nearEnd(endY: number, viewportBottom: number, viewportHeight: number) {
  return endY - viewportBottom <= viewportHeight;
}

export function sameOrigin(a: BoardOrigin, b: BoardOrigin) {
  if (a.kind === 'none' || b.kind === 'none') {
    return a.kind === 'none' && b.kind === 'none' && a.reason === b.reason;
  }
  return (
    a.kind === b.kind &&
    a.point.latitude === b.point.latitude &&
    a.point.longitude === b.point.longitude &&
    (a.kind === 'place' ? a.label : null) === (b.kind === 'place' ? b.label : null)
  );
}

export type BoardSnapshot = { state: BoardState; refreshing: boolean };

type Query = { origin: BoardOrigin; filter: BoardFilter };

export function createBoardController(
  service: Pick<BoardService, 'page'>,
  now: () => Date = () => new Date(),
) {
  let state = INITIAL_BOARD;
  let loadGeneration: number | null = null;
  let pageBusy = false;
  let reloadAfter = false;
  let query: Query | null = null;
  let snapshot: BoardSnapshot = { state, refreshing: false };
  const listeners = new Set<() => void>();

  function emit() {
    snapshot = { state, refreshing: loadGeneration !== null && state.kind === 'ready' };
    for (const listener of listeners) listener();
  }

  function dispatch(event: BoardEvent) {
    state = boardReducer(state, event);
    emit();
  }

  async function load() {
    if (!query) return;
    if (loadGeneration !== null) {
      if (loadGeneration !== state.generation) reloadAfter = true;
      return;
    }
    const { origin, filter } = query;
    state = boardReducer(state, { type: 'loadStarted' });
    const generation = state.generation;
    loadGeneration = generation;
    emit();
    let answer: BoardEvent;
    try {
      const page = await service.page(origin, filter, null);
      answer = { type: 'loadSucceeded', page, at: now().toISOString(), generation };
    } catch {
      answer = { type: 'loadFailed', generation };
    }
    loadGeneration = null;
    dispatch(answer);
    if (reloadAfter) {
      reloadAfter = false;
      await load();
    }
  }

  async function nextPage(from: 'idle' | 'failed') {
    if (!query || pageBusy || loadGeneration !== null) return;
    if (state.kind !== 'ready' || state.next === null || state.page !== from) return;
    const { origin, filter } = query;
    const after = state.next;
    const generation = state.generation;
    pageBusy = true;
    dispatch({ type: 'pageStarted' });
    let answer: BoardEvent;
    try {
      const page = await service.page(origin, filter, after);
      answer = { type: 'pageSucceeded', page, at: now().toISOString(), generation };
    } catch {
      answer = { type: 'pageFailed', generation };
    }
    pageBusy = false;
    dispatch(answer);
  }

  return {
    get: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setQuery(origin: BoardOrigin, filter: BoardFilter) {
      if (query && sameOrigin(query.origin, origin) && query.filter === filter) return;
      if (query && !sameOrigin(query.origin, origin)) dispatch({ type: 'originChanged' });
      else if (query) dispatch({ type: 'filterChanged' });
      query = { origin, filter };
      return load();
    },
    load,
    loadMore: () => nextPage('idle'),
    retryPage: () => nextPage('failed'),
    applied: (id: string) => dispatch({ type: 'applied', id }),
    withdrawn: (id: string) => dispatch({ type: 'withdrawn', id }),
  };
}

export type BoardController = ReturnType<typeof createBoardController>;

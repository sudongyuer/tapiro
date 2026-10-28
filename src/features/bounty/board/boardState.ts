import type { JustApplied } from '../shared/justApplied';
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
  | { type: 'blocked'; posterId: string }
  | { type: 'originChanged' }
  | { type: 'filterChanged' };

export const INITIAL_BOARD: BoardState = { kind: 'loading', generation: 0, writes: {} };

type Writes = BoardState['writes'];

function unique(rows: BoardRow[], seen = new Set<string>()) {
  return rows.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

function overlaid(rows: BoardRow[], writes: Writes) {
  return rows.map((row) => {
    const write = writes[row.id];
    return write && write.applied !== row.appliedByMe
      ? { ...row, appliedByMe: write.applied }
      : row;
  });
}

function writesNewerThan(writes: Writes, loadGeneration: number): Writes {
  return Object.fromEntries(
    Object.entries(writes).filter(([, write]) => write.generation >= loadGeneration),
  );
}

function fresh(page: BoardPage, at: string, generation: number, writes: Writes): BoardState {
  return {
    kind: 'ready',
    generation,
    writes,
    rows: overlaid(unique(page.items), writes),
    total: page.total ?? null,
    beyondTotal: page.beyondTotal ?? null,
    next: page.next,
    loadedAt: at,
    refreshFailed: false,
    page: 'idle',
  };
}

function written(state: BoardState, id: string, applied: boolean): BoardState {
  const writes = { ...state.writes, [id]: { applied, generation: state.generation } };
  if (state.kind !== 'ready') return { ...state, writes };
  return { ...state, writes, rows: overlaid(state.rows, writes) };
}

function withoutPoster(state: BoardState, posterId: string): BoardState {
  const generation = state.generation + 1;
  if (state.kind !== 'ready') return { ...state, generation };
  return {
    ...state,
    generation,
    rows: state.rows.filter((row) => row.poster.id !== posterId),
    total: null,
    beyondTotal: null,
    page: 'idle',
  };
}

export function boardReducer(state: BoardState, event: BoardEvent): BoardState {
  const { generation, writes } = state;
  switch (event.type) {
    case 'originChanged':
    case 'filterChanged':
      return { kind: 'loading', generation: generation + 1, writes };
    case 'loadStarted':
      return state.kind === 'ready'
        ? { ...state, generation: generation + 1, page: 'idle' }
        : { kind: 'loading', generation: generation + 1, writes };
    case 'applied':
      return written(state, event.id, true);
    case 'withdrawn':
      return written(state, event.id, false);
    case 'blocked':
      return withoutPoster(state, event.posterId);
    case 'pageStarted':
      return state.kind === 'ready' && state.next !== null && state.page !== 'loading'
        ? { ...state, page: 'loading' }
        : state;
  }
  if (event.generation !== generation) return state;
  switch (event.type) {
    case 'loadSucceeded':
      return fresh(event.page, event.at, generation, writesNewerThan(writes, generation));
    case 'loadFailed':
      return state.kind === 'ready'
        ? { ...state, refreshFailed: true }
        : { kind: 'failed', generation, writes };
    case 'pageSucceeded':
      if (state.kind !== 'ready') return state;
      if (event.page.restarted) return fresh(event.page, event.at, generation, writes);
      return {
        ...state,
        rows: [
          ...state.rows,
          ...overlaid(unique(event.page.items, new Set(state.rows.map((row) => row.id))), writes),
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

export function boardBody(state: BoardState, refreshing: boolean) {
  if (state.kind !== 'ready') return state.kind;
  if (state.rows.length > 0) return 'rows';
  if (state.total !== null) return 'empty';
  if (refreshing || state.page === 'loading') return 'loading';
  if (state.next === null) return 'empty';
  return state.refreshFailed ? 'failed' : 'loading';
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

export type BoardSnapshot = { state: BoardState; refreshing: boolean; origin: BoardOrigin | null };

type Query = { origin: BoardOrigin; filter: BoardFilter };

type Stamps = Pick<JustApplied, 'drop' | 'retainCards'>;

export function createBoardController(
  service: Pick<BoardService, 'page'>,
  now: () => Date = () => new Date(),
  stamps?: Stamps,
) {
  let state = INITIAL_BOARD;
  let loadGeneration: number | null = null;
  let pageBusy = false;
  let reloadAfter = false;
  let query: Query | null = null;
  let snapshot: BoardSnapshot = { state, refreshing: false, origin: null };
  const listeners = new Set<() => void>();

  function emit() {
    snapshot = {
      state,
      refreshing: loadGeneration !== null && state.kind === 'ready',
      origin: query?.origin ?? null,
    };
    for (const listener of listeners) listener();
  }

  function dispatch(event: BoardEvent) {
    state = boardReducer(state, event);
    emit();
  }

  let inflight: Promise<void> | null = null;

  async function loadOnce(origin: BoardOrigin, filter: BoardFilter) {
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
    if (
      answer.type === 'loadSucceeded' &&
      state.kind === 'ready' &&
      state.generation === generation
    ) {
      stamps?.retainCards(state.rows.map((row) => row.id));
    }
  }

  let running = false;

  async function loadUntilCurrent() {
    try {
      do {
        reloadAfter = false;
        if (query) await loadOnce(query.origin, query.filter);
      } while (reloadAfter);
    } finally {
      running = false;
    }
  }

  function load(): Promise<void> {
    if (!query) return Promise.resolve();
    if (running && inflight) {
      if (loadGeneration !== state.generation) reloadAfter = true;
      return inflight;
    }
    running = true;
    inflight = loadUntilCurrent();
    return inflight;
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

  function setQuery(origin: BoardOrigin, filter: BoardFilter, reloadSame: boolean) {
    if (query && sameOrigin(query.origin, origin) && query.filter === filter) {
      return reloadSame ? load() : Promise.resolve();
    }
    const previous = query;
    query = { origin, filter };
    if (previous && !sameOrigin(previous.origin, origin)) dispatch({ type: 'originChanged' });
    else if (previous) dispatch({ type: 'filterChanged' });
    return load();
  }

  return {
    get: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setQuery: (origin: BoardOrigin, filter: BoardFilter) => setQuery(origin, filter, false),
    async refreshFrom(evaluate: () => Promise<BoardOrigin | null>) {
      const origin = await evaluate();
      if (origin && query) await setQuery(origin, query.filter, true);
    },
    load,
    loadMore: () => nextPage('idle'),
    retryPage: () => nextPage('failed'),
    applied: (id: string) => dispatch({ type: 'applied', id }),
    withdrawn: (id: string) => dispatch({ type: 'withdrawn', id }),
    blocked(posterId: string) {
      if (state.kind === 'ready') {
        for (const row of state.rows) if (row.poster.id === posterId) stamps?.drop(row.id);
      }
      dispatch({ type: 'blocked', posterId });
      return load();
    },
  };
}

export type BoardController = ReturnType<typeof createBoardController>;

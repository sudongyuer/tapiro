import { describe, expect, test } from 'bun:test';
import type { PlaceSuggestionsEvent } from 'tapiro-kit';

import {
  createPlaceSearch,
  QUERY_DEBOUNCE_MS,
  type PlaceFacade,
  type PlaceSearchSnapshot,
  type Timers,
} from './placeSearch';

function fakeFacade() {
  const listeners = new Set<(event: PlaceSuggestionsEvent) => void>();
  const queries: { searchId: string; query: string; requestId: string }[] = [];
  const ended: string[] = [];
  let sequence = 0;
  const facade: PlaceFacade = {
    startPlaceSearch: () => `search-${++sequence}`,
    updatePlaceQuery(searchId, query) {
      const requestId = `request-${++sequence}`;
      queries.push({ searchId, query, requestId });
      return requestId;
    },
    addPlaceSuggestionsListener(cb) {
      listeners.add(cb);
      return { remove: () => listeners.delete(cb) };
    },
    resolvePlace: async () => ({ status: 'notFound' }),
    placeAt: async () => ({ status: 'notFound' }),
    endPlaceSearch: (searchId) => ended.push(searchId),
  };
  const emit = (event: PlaceSuggestionsEvent) => listeners.forEach((listener) => listener(event));
  return { facade, queries, ended, listeners, emit };
}

function fakeTimers() {
  let now = 0;
  const due = new Map<number, { at: number; run: () => void }>();
  let next = 0;
  const timers: Timers = {
    set(run, ms) {
      due.set(++next, { at: now + ms, run });
      return next;
    },
    clear: (handle) => due.delete(handle as number),
  };
  const advance = (ms: number) => {
    now += ms;
    for (const [handle, timer] of [...due]) {
      if (timer.at <= now) {
        due.delete(handle);
        timer.run();
      }
    }
  };
  return { timers, advance };
}

function setup() {
  const fake = fakeFacade();
  const clock = fakeTimers();
  const seen: PlaceSearchSnapshot[] = [];
  const search = createPlaceSearch(fake.facade, null, (s) => seen.push(s), clock.timers);
  const last = () => seen[seen.length - 1];
  return { ...fake, ...clock, search, last };
}

const ITEMS = [{ id: '1.0', title: 'Sunway Pyramid', subtitle: 'Bandar Sunway' }];

describe('typing a query', () => {
  test('sends only the query typed last once typing pauses', () => {
    const { search, queries, advance } = setup();
    search.setQuery('s');
    advance(100);
    search.setQuery('sun');
    advance(QUERY_DEBOUNCE_MS - 1);
    expect(queries).toHaveLength(0);
    advance(1);
    expect(queries.map((q) => q.query)).toEqual(['sun']);
  });

  test('a blank query is idle and sends nothing', () => {
    const { search, queries, advance, last } = setup();
    search.setQuery('   ');
    advance(QUERY_DEBOUNCE_MS);
    expect(queries).toHaveLength(0);
    expect(last().state).toEqual({ kind: 'idle' });
  });
});

describe('suggestion events', () => {
  test('the answer to the latest request is shown', () => {
    const { search, queries, advance, emit, last } = setup();
    search.setQuery('sunway');
    expect(last().state).toEqual({ kind: 'loading' });
    advance(QUERY_DEBOUNCE_MS);
    const { searchId, requestId } = queries[0];
    emit({ searchId, requestId, status: 'ok', items: ITEMS });
    expect(last()).toEqual({ query: 'sunway', state: { kind: 'ready', items: ITEMS } });
  });

  test('an answer to an earlier request is dropped', () => {
    const { search, queries, advance, emit, last } = setup();
    search.setQuery('sun');
    advance(QUERY_DEBOUNCE_MS);
    search.setQuery('sunway');
    advance(QUERY_DEBOUNCE_MS);
    const [stale, latest] = queries;
    emit({ searchId: stale.searchId, requestId: stale.requestId, status: 'ok', items: ITEMS });
    expect(last().state).toEqual({ kind: 'loading' });
    emit({
      searchId: latest.searchId,
      requestId: latest.requestId,
      status: 'failed',
      code: 'network',
    });
    expect(last().state).toEqual({ kind: 'failed' });
  });

  test('an answer that arrives after the query changed again is dropped', () => {
    const { search, queries, advance, emit, last } = setup();
    search.setQuery('sun');
    advance(QUERY_DEBOUNCE_MS);
    search.setQuery('sunw');
    const { searchId, requestId } = queries[0];
    emit({ searchId, requestId, status: 'ok', items: ITEMS });
    expect(last()).toEqual({ query: 'sunw', state: { kind: 'loading' } });
  });

  test('an answer for another search session is dropped', () => {
    const { search, queries, advance, emit, last } = setup();
    search.setQuery('sunway');
    advance(QUERY_DEBOUNCE_MS);
    emit({ searchId: 'other', requestId: queries[0].requestId, status: 'ok', items: ITEMS });
    expect(last().state).toEqual({ kind: 'loading' });
  });

  test('typing the same query again retries after a failure', () => {
    const { search, queries, advance, emit, last } = setup();
    search.setQuery('sunway');
    advance(QUERY_DEBOUNCE_MS);
    emit({ ...queries[0], status: 'failed', code: 'network' });
    search.setQuery('sunway');
    advance(QUERY_DEBOUNCE_MS);
    emit({ ...queries[1], status: 'ok', items: ITEMS });
    expect(last().state).toEqual({ kind: 'ready', items: ITEMS });
  });
});

describe('ending the search', () => {
  test('removes the listener, ends the native session and cancels a pending query', () => {
    const { search, queries, ended, listeners, advance } = setup();
    search.setQuery('sunway');
    search.end();
    advance(QUERY_DEBOUNCE_MS);
    expect(listeners.size).toBe(0);
    expect(ended).toEqual(['search-1']);
    expect(queries).toHaveLength(0);
  });

  test('nothing is published and resolve fails after the end', async () => {
    const { search, queries, advance, emit, last } = setup();
    search.setQuery('sunway');
    advance(QUERY_DEBOUNCE_MS);
    search.end();
    emit({ ...queries[0], status: 'ok', items: ITEMS });
    search.setQuery('pyramid');
    expect(last()).toEqual({ query: 'sunway', state: { kind: 'loading' } });
    expect(await search.resolve('1.0')).toEqual({ status: 'failed', code: 'unknown' });
  });

  test('ending twice ends the native session once', () => {
    const { search, ended } = setup();
    search.end();
    search.end();
    expect(ended).toHaveLength(1);
  });
});

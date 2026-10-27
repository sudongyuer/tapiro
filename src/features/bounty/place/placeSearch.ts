import type { PlacePoint, PlaceResult, PlaceSuggestion, PlaceSuggestionsEvent } from 'tapiro-kit';

export type PlaceFacade = {
  startPlaceSearch(region: PlacePoint | null): string;
  updatePlaceQuery(searchId: string, query: string): string;
  addPlaceSuggestionsListener(cb: (event: PlaceSuggestionsEvent) => void): { remove(): void };
  resolvePlace(searchId: string, suggestionId: string): Promise<PlaceResult>;
  placeAt(point: PlacePoint): Promise<PlaceResult>;
  endPlaceSearch(searchId: string): void;
};

export type PlaceSearchState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; items: PlaceSuggestion[] }
  | { kind: 'failed' };

export type PlaceSearchSnapshot = { query: string; state: PlaceSearchState };

export type Timers = {
  set(run: () => void, ms: number): unknown;
  clear(handle: unknown): void;
};

export const QUERY_DEBOUNCE_MS = 250;

export const IDLE_SNAPSHOT: PlaceSearchSnapshot = { query: '', state: { kind: 'idle' } };

const ENDED: PlaceResult = { status: 'failed', code: 'unknown' };

const systemTimers: Timers = {
  set: (run, ms) => setTimeout(run, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export function createPlaceSearch(
  facade: PlaceFacade,
  region: PlacePoint | null,
  onChange: (snapshot: PlaceSearchSnapshot) => void,
  timers: Timers = systemTimers,
) {
  let snapshot = IDLE_SNAPSHOT;
  let latestRequestId: string | null = null;
  let pending: unknown = null;
  let ended = false;

  const publish = (next: PlaceSearchSnapshot) => {
    snapshot = next;
    onChange(next);
  };

  const cancelPending = () => {
    if (pending !== null) timers.clear(pending);
    pending = null;
  };

  const searchId = facade.startPlaceSearch(region);
  const subscription = facade.addPlaceSuggestionsListener((event) => {
    if (ended || event.searchId !== searchId || event.requestId !== latestRequestId) return;
    publish({
      query: snapshot.query,
      state: event.status === 'ok' ? { kind: 'ready', items: event.items } : { kind: 'failed' },
    });
  });

  return {
    snapshot: () => snapshot,
    setQuery(query: string) {
      if (ended) return;
      cancelPending();
      latestRequestId = null;
      if (query.trim() === '') {
        publish({ query, state: { kind: 'idle' } });
        return;
      }
      publish({ query, state: { kind: 'loading' } });
      pending = timers.set(() => {
        pending = null;
        latestRequestId = facade.updatePlaceQuery(searchId, query);
      }, QUERY_DEBOUNCE_MS);
    },
    resolve(suggestionId: string): Promise<PlaceResult> {
      return ended ? Promise.resolve(ENDED) : facade.resolvePlace(searchId, suggestionId);
    },
    end() {
      if (ended) return;
      ended = true;
      cancelPending();
      subscription.remove();
      facade.endPlaceSearch(searchId);
    },
  };
}

export type PlaceSearch = ReturnType<typeof createPlaceSearch>;

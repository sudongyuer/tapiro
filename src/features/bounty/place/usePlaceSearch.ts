import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlaceResult } from 'tapiro-kit';

import type { Point } from '@/lib/location';

import { createPlaceSearch, IDLE_SNAPSHOT, type PlaceSearch } from './placeSearch';
import { placeFacade } from './places';

const ENDED: PlaceResult = { status: 'failed', code: 'unknown' };

export function usePlaceSearch(region: Point | null) {
  const [snapshot, setSnapshot] = useState(IDLE_SNAPSHOT);
  const search = useRef<PlaceSearch | null>(null);
  const query = useRef('');
  const latitude = region?.latitude ?? null;
  const longitude = region?.longitude ?? null;

  useEffect(() => {
    const center = latitude === null || longitude === null ? null : { latitude, longitude };
    const current = createPlaceSearch(placeFacade, center, (next) => {
      query.current = next.query;
      setSnapshot(next);
    });
    search.current = current;
    if (query.current !== '') current.setQuery(query.current);
    return () => {
      current.end();
      if (search.current === current) search.current = null;
    };
  }, [latitude, longitude]);

  const setQuery = useCallback((next: string) => search.current?.setQuery(next), []);
  const resolve = useCallback(
    (id: string) => search.current?.resolve(id) ?? Promise.resolve(ENDED),
    [],
  );

  return { query: snapshot.query, setQuery, state: snapshot.state, resolve };
}

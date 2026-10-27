import type {
  PlaceResult,
  PlaceSuggestion,
  PlaceSuggestionsEvent,
  ResolvedPlace,
} from 'tapiro-kit';

import type { PlaceFacade } from './placeSearch';

export const PLACES_FIXTURES = ['ok', 'none', 'fail', 'resolveFail'] as const;
export type PlacesFixture = (typeof PLACES_FIXTURES)[number];

export function placesFixture(value: string | undefined): PlacesFixture {
  return PLACES_FIXTURES.find((fixture) => fixture === value) ?? 'ok';
}

type FixturePlace = PlaceSuggestion & { place: ResolvedPlace };

export const FIXTURE_PLACES: FixturePlace[] = [
  {
    id: 'sunway-geo',
    title: 'Sunway Geo Residences',
    subtitle: 'Jalan Lagoon Selatan, Bandar Sunway',
    place: {
      name: 'Sunway Geo Residences',
      latitude: 3.0657,
      longitude: 101.611,
      address: 'Jalan Lagoon Selatan, Bandar Sunway, 47500 Subang Jaya, Selangor',
    },
  },
  {
    id: 'sunway-university',
    title: 'Sunway University',
    subtitle: '5, Jalan Universiti, Bandar Sunway',
    place: {
      name: 'Sunway University',
      latitude: 3.0671,
      longitude: 101.6036,
      address: '5, Jalan Universiti, Bandar Sunway, 47500 Subang Jaya, Selangor',
    },
  },
  {
    id: 'sunway-pyramid',
    title: 'Sunway Pyramid',
    subtitle: '3, Jalan PJS 11/15, Bandar Sunway',
    place: {
      name: 'Sunway Pyramid',
      latitude: 3.0733,
      longitude: 101.6078,
      address: '3, Jalan PJS 11/15, Bandar Sunway, 47500 Petaling Jaya, Selangor',
    },
  },
];

const FAILED: PlaceResult = { status: 'failed', code: 'network' };
const EVENT_DELAY_MS = 120;

export function createFixturePlaces(
  fixture: PlacesFixture,
  delay: (run: () => void) => void = (run) => setTimeout(run, EVENT_DELAY_MS),
): PlaceFacade {
  const listeners = new Set<(event: PlaceSuggestionsEvent) => void>();
  let sequence = 0;
  let failNext = fixture === 'fail';
  const nextId = (prefix: string) => `${prefix}-${++sequence}`;

  return {
    startPlaceSearch: () => nextId('search'),
    updatePlaceQuery(searchId) {
      const requestId = nextId('request');
      const event: PlaceSuggestionsEvent = failNext
        ? { searchId, requestId, status: 'failed', code: 'network' }
        : {
            searchId,
            requestId,
            status: 'ok',
            items:
              fixture === 'none'
                ? []
                : FIXTURE_PLACES.map(({ id, title, subtitle }) => ({ id, title, subtitle })),
          };
      failNext = false;
      delay(() => listeners.forEach((listener) => listener(event)));
      return requestId;
    },
    addPlaceSuggestionsListener(cb) {
      listeners.add(cb);
      return { remove: () => listeners.delete(cb) };
    },
    async resolvePlace(_searchId, suggestionId) {
      if (fixture === 'resolveFail') return FAILED;
      const match = FIXTURE_PLACES.find((place) => place.id === suggestionId);
      return match ? { status: 'ok', place: match.place } : { status: 'notFound' };
    },
    async placeAt() {
      return fixture === 'resolveFail' ? FAILED : { status: 'ok', place: FIXTURE_PLACES[2].place };
    },
    endPlaceSearch() {},
  };
}

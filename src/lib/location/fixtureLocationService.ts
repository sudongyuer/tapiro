import type { LocationPermission, LocationService, PermissionState, Point } from './types';

export const LOCATION_FIXTURES = [
  'granted',
  'undetermined',
  'undeterminedDeny',
  'denied',
  'reduced',
  'noFix',
] as const;
export type LocationFixture = (typeof LOCATION_FIXTURES)[number];

export const SUNWAY_PYRAMID: Point = { latitude: 3.0733, longitude: 101.6078 };

export function locationFixture(value: string | undefined): LocationFixture {
  return LOCATION_FIXTURES.find((fixture) => fixture === value) ?? 'granted';
}

const state = (status: LocationPermission, reduced = false): PermissionState => ({
  status,
  reduced,
});

export function createFixtureLocationService(fixture: LocationFixture): LocationService {
  let current: PermissionState = {
    granted: state('granted'),
    undetermined: state('undetermined'),
    undeterminedDeny: state('undetermined'),
    denied: state('denied'),
    reduced: state('granted', true),
    noFix: state('granted'),
  }[fixture];
  return {
    async permission() {
      return current;
    },
    async request() {
      if (current.status === 'undetermined')
        current = fixture === 'undeterminedDeny' ? state('denied') : state('granted');
      return current;
    },
    async currentPoint() {
      return current.status === 'granted' && fixture !== 'noFix' ? SUNWAY_PYRAMID : null;
    },
  };
}

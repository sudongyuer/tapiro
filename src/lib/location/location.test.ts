import { expect, test } from 'bun:test';

import { createLocationService, type LocationApi } from './createLocationService';
import { createFixtureLocationService, SUNWAY_PYRAMID } from './fixtureLocationService';
import { mapPermission } from './mapPermission';

const base = { status: 'undetermined', granted: false, canAskAgain: true };

test('mapPermission maps granted with and without reduced accuracy', () => {
  expect(
    mapPermission({ ...base, status: 'granted', granted: true, ios: { accuracy: 'full' } }),
  ).toEqual({
    status: 'granted',
    reduced: false,
  });
  expect(
    mapPermission({ ...base, status: 'granted', granted: true, ios: { accuracy: 'reduced' } }),
  ).toEqual({ status: 'granted', reduced: true });
});

test('mapPermission maps denied, undetermined and a closed prompt', () => {
  expect(mapPermission({ ...base, status: 'denied' })).toEqual({
    status: 'denied',
    reduced: false,
  });
  expect(mapPermission(base)).toEqual({ status: 'undetermined', reduced: false });
  expect(mapPermission({ ...base, canAskAgain: false })).toEqual({
    status: 'denied',
    reduced: false,
  });
});

const coords = { latitude: 1, longitude: 2, altitude: 9, accuracy: 5 };

function api(overrides: Partial<LocationApi>): LocationApi {
  return {
    getForegroundPermissionsAsync: async () => base,
    requestForegroundPermissionsAsync: async () => base,
    getLastKnownPositionAsync: async () => null,
    getCurrentPositionAsync: async () => ({ coords }),
    ...overrides,
  };
}

test('currentPoint prefers the last known point and returns only latitude and longitude', async () => {
  const service = createLocationService(
    api({
      getLastKnownPositionAsync: async () => ({ coords }),
      getCurrentPositionAsync: async () => {
        throw new Error('should not be called');
      },
    }),
  );
  expect(await service.currentPoint()).toEqual({ latitude: 1, longitude: 2 });
});

test('currentPoint falls back to a fresh fix', async () => {
  const service = createLocationService(api({}));
  expect(await service.currentPoint()).toEqual({ latitude: 1, longitude: 2 });
});

test('currentPoint is null on timeout', async () => {
  const service = createLocationService(
    api({ getCurrentPositionAsync: () => new Promise(() => {}) }),
    10,
  );
  expect(await service.currentPoint()).toBeNull();
});

test('currentPoint is null when the platform throws', async () => {
  const service = createLocationService(
    api({
      getCurrentPositionAsync: async () => {
        throw new Error('unavailable');
      },
    }),
  );
  expect(await service.currentPoint()).toBeNull();
  const lastKnownThrows = createLocationService(
    api({
      getLastKnownPositionAsync: async () => {
        throw new Error('unavailable');
      },
    }),
  );
  expect(await lastKnownThrows.currentPoint()).toBeNull();
});

test('fixture granted gives the Sunway Pyramid point', async () => {
  const service = createFixtureLocationService('granted');
  expect(await service.permission()).toEqual({ status: 'granted', reduced: false });
  expect(await service.currentPoint()).toEqual(SUNWAY_PYRAMID);
});

test('fixture undetermined asks first and grants on request', async () => {
  const service = createFixtureLocationService('undetermined');
  expect((await service.permission()).status).toBe('undetermined');
  expect(await service.currentPoint()).toBeNull();
  expect((await service.request()).status).toBe('granted');
  expect(await service.currentPoint()).toEqual(SUNWAY_PYRAMID);
});

test('fixture undeterminedDeny denies on request and stays denied', async () => {
  const service = createFixtureLocationService('undeterminedDeny');
  expect((await service.request()).status).toBe('denied');
  expect((await service.permission()).status).toBe('denied');
  expect(await service.currentPoint()).toBeNull();
});

test('fixture denied, reduced and noFix', async () => {
  const denied = createFixtureLocationService('denied');
  expect((await denied.request()).status).toBe('denied');
  expect(await denied.currentPoint()).toBeNull();
  const reduced = createFixtureLocationService('reduced');
  expect(await reduced.permission()).toEqual({ status: 'granted', reduced: true });
  expect(await reduced.currentPoint()).toEqual(SUNWAY_PYRAMID);
  const noFix = createFixtureLocationService('noFix');
  expect((await noFix.permission()).status).toBe('granted');
  expect(await noFix.currentPoint()).toBeNull();
});

import { describe, expect, test } from 'bun:test';
import type { PlaceResult } from 'tapiro-kit';

import {
  createFixtureLocationService,
  SUNWAY_PYRAMID,
} from '@/lib/location/fixtureLocationService';

import { currentPlace } from './currentPlace';

const named = (name: string) => async (): Promise<PlaceResult> => ({
  status: 'ok',
  place: { name, latitude: 3.07, longitude: 101.6, address: 'Jalan PJS 11/15' },
});

describe('using the current location as the place', () => {
  test('asks once when undetermined, then names the point after the nearest place', async () => {
    const location = createFixtureLocationService('undetermined');
    const result = await currentPlace(location, named('Sunway Pyramid'));
    expect(result).toEqual({
      kind: 'picked',
      place: { name: 'Sunway Pyramid', ...SUNWAY_PYRAMID, address: null },
    });
    expect((await location.permission()).status).toBe('granted');
  });

  test('a refused prompt and a denied permission pick nothing', async () => {
    expect(
      await currentPlace(createFixtureLocationService('undeterminedDeny'), named('x')),
    ).toEqual({
      kind: 'denied',
    });
    expect(await currentPlace(createFixtureLocationService('denied'), named('x'))).toEqual({
      kind: 'denied',
    });
  });

  test('no fix picks nothing', async () => {
    expect(await currentPlace(createFixtureLocationService('noFix'), named('x'))).toEqual({
      kind: 'noFix',
    });
  });

  test('a failed or throwing reverse geocode keeps the point with an empty name', async () => {
    const failed = async (): Promise<PlaceResult> => ({ status: 'failed', code: 'network' });
    const thrown = async (): Promise<PlaceResult> => {
      throw new Error('kit');
    };
    for (const placeAt of [failed, thrown]) {
      expect(await currentPlace(createFixtureLocationService('granted'), placeAt)).toEqual({
        kind: 'picked',
        place: { name: '', ...SUNWAY_PYRAMID, address: null },
      });
    }
  });
});

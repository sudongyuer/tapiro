import { describe, expect, test } from 'bun:test';
import type { PlaceSuggestionsEvent } from 'tapiro-kit';

import { createFixturePlaces, FIXTURE_PLACES, placesFixture } from './fixturePlaces';

const now = (run: () => void) => run();

function query(fixture: Parameters<typeof createFixturePlaces>[0], times = 1) {
  const places = createFixturePlaces(fixture, now);
  const events: PlaceSuggestionsEvent[] = [];
  places.addPlaceSuggestionsListener((event) => events.push(event));
  const searchId = places.startPlaceSearch(null);
  for (let i = 0; i < times; i++) places.updatePlaceQuery(searchId, 'sunway');
  return { places, events, searchId };
}

describe('place fixtures', () => {
  test('an unknown launch argument falls back to ok', () => {
    expect(placesFixture(undefined)).toBe('ok');
    expect(placesFixture('bogus')).toBe('ok');
    expect(placesFixture('fail')).toBe('fail');
  });

  test('ok lists the three Sunway places and resolves each', async () => {
    const { places, events, searchId } = query('ok');
    const event = events[0];
    expect(event.status === 'ok' && event.items.map((item) => item.title)).toEqual([
      'Sunway Geo Residences',
      'Sunway University',
      'Sunway Pyramid',
    ]);
    expect(await places.resolvePlace(searchId, 'sunway-geo')).toEqual({
      status: 'ok',
      place: FIXTURE_PLACES[0].place,
    });
  });

  test('none answers with no results', () => {
    const { events } = query('none');
    expect(events[0]).toMatchObject({ status: 'ok', items: [] });
  });

  test('fail fails the first query and recovers on the next', () => {
    const { events } = query('fail', 2);
    expect(events.map((event) => event.status)).toEqual(['failed', 'ok']);
  });

  test('resolveFail lists results but cannot resolve them', async () => {
    const { places, events, searchId } = query('resolveFail');
    expect(events[0].status).toBe('ok');
    expect(await places.resolvePlace(searchId, 'sunway-geo')).toEqual({
      status: 'failed',
      code: 'network',
    });
  });

  test('a removed listener hears nothing', () => {
    const places = createFixturePlaces('ok', now);
    const events: PlaceSuggestionsEvent[] = [];
    const subscription = places.addPlaceSuggestionsListener((event) => events.push(event));
    subscription.remove();
    places.updatePlaceQuery(places.startPlaceSearch(null), 'sunway');
    expect(events).toHaveLength(0);
  });
});

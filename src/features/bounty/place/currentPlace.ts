import type { PlacePoint, PlaceResult, ResolvedPlace } from 'tapiro-kit';

import type { LocationService } from '@/lib/location';

export type CurrentPlace =
  { kind: 'picked'; place: ResolvedPlace } | { kind: 'denied' } | { kind: 'noFix' };

export async function currentPlace(
  location: LocationService,
  placeAt: (point: PlacePoint) => Promise<PlaceResult>,
): Promise<CurrentPlace> {
  let { status } = await location.permission();
  if (status === 'undetermined') status = (await location.request()).status;
  if (status !== 'granted') return { kind: 'denied' };
  const point = await location.currentPoint();
  if (!point) return { kind: 'noFix' };
  const named = await placeAt(point).catch(() => null);
  return {
    kind: 'picked',
    place: {
      name: named?.status === 'ok' ? named.place.name : '',
      latitude: point.latitude,
      longitude: point.longitude,
      address: null,
    },
  };
}

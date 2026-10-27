import type { LocationPermission, Point } from '@/lib/location/types';
import type { UserCleanups } from '@/lib/userCleanups';

import type { BoardOrigin } from './types';

export type SettingsLike = {
  get(key: string): unknown;
  set(values: Record<string, unknown>): void;
};

export type ChosenPlace = { label: string; point: Point };

const placeKey = (userId: string) => `tapiro.boardPlace.${userId}`;
const cardKey = (userId: string) => `tapiro.boardLocationCard.${userId}`;

const isCoordinate = (value: unknown, limit: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit;

function toChosenPlace(value: unknown): ChosenPlace | null {
  if (typeof value !== 'string' || value === '') return null;
  try {
    const parsed = JSON.parse(value) as { label?: unknown; point?: Partial<Point> };
    const { label } = parsed;
    const latitude = parsed.point?.latitude;
    const longitude = parsed.point?.longitude;
    if (typeof label !== 'string' || label === '') return null;
    if (!isCoordinate(latitude, 90) || !isCoordinate(longitude, 180)) return null;
    return { label, point: { latitude, longitude } };
  } catch {
    return null;
  }
}

// Cleared by writing '': Settings.set drops null-valued keys when converting to a property list.
export function createOriginStore(settings: SettingsLike, cleanups?: UserCleanups) {
  const store = {
    chosenPlace(userId: string): ChosenPlace | null {
      return toChosenPlace(settings.get(placeKey(userId)));
    },
    setChosenPlace(userId: string, place: ChosenPlace | null) {
      settings.set({ [placeKey(userId)]: place === null ? '' : JSON.stringify(place) });
    },
    cardDismissed(userId: string): boolean {
      return settings.get(cardKey(userId)) === '1';
    },
    dismissCard(userId: string) {
      settings.set({ [cardKey(userId)]: '1' });
    },
    clear(userId: string) {
      settings.set({ [placeKey(userId)]: '', [cardKey(userId)]: '' });
    },
  };
  cleanups?.register((userId) => store.clear(userId));
  return store;
}

export type OriginStore = ReturnType<typeof createOriginStore>;

export type OriginInputs = {
  permission: LocationPermission;
  point: Point | null;
  chosen: ChosenPlace | null;
  dismissed: boolean;
};

export function resolveOrigin({ permission, point, chosen, dismissed }: OriginInputs): BoardOrigin {
  if (permission === 'granted' && point) return { kind: 'me', point };
  if (chosen) return { kind: 'place', point: chosen.point, label: chosen.label };
  if (permission === 'granted') return { kind: 'none', reason: 'noFix' };
  if (permission === 'denied') return { kind: 'none', reason: 'denied' };
  return { kind: 'none', reason: dismissed ? 'declined' : 'undetermined' };
}

const EARTH_RADIUS_M = 6_371_008.8;
export const ORIGIN_MOVE_M = 100;

export function distanceM(a: Point, b: Point) {
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function steadyOrigin(previous: BoardOrigin | null, next: BoardOrigin): BoardOrigin {
  if (previous?.kind === 'me' && next.kind === 'me') {
    return distanceM(previous.point, next.point) < ORIGIN_MOVE_M ? previous : next;
  }
  return next;
}

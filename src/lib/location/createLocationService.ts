import { mapPermission, type PermissionResponseLike } from './mapPermission';
import type { LocationService, Point } from './types';

export type LocationApi = {
  getForegroundPermissionsAsync(): Promise<PermissionResponseLike>;
  requestForegroundPermissionsAsync(): Promise<PermissionResponseLike>;
  getLastKnownPositionAsync(options: { maxAge: number }): Promise<{ coords: Point } | null>;
  getCurrentPositionAsync(): Promise<{ coords: Point }>;
};

const LAST_KNOWN_MAX_AGE_MS = 120_000;
const FIX_TIMEOUT_MS = 10_000;

function point({ coords }: { coords: Point }): Point {
  return { latitude: coords.latitude, longitude: coords.longitude };
}

async function withTimeout<T>(work: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export function createLocationService(
  api: LocationApi,
  timeoutMs: number = FIX_TIMEOUT_MS,
): LocationService {
  return {
    async permission() {
      return mapPermission(await api.getForegroundPermissionsAsync());
    },
    async request() {
      return mapPermission(await api.requestForegroundPermissionsAsync());
    },
    async currentPoint() {
      try {
        const lastKnown = await api.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS });
        if (lastKnown) return point(lastKnown);
        const fix = await withTimeout(api.getCurrentPositionAsync(), timeoutMs);
        return fix ? point(fix) : null;
      } catch {
        return null;
      }
    },
  };
}

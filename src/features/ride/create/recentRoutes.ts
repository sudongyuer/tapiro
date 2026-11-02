import type { SettingsLike } from '@/features/place/originStore';

import type { DraftPlace } from './draft';

export type RecentRoute = { start: DraftPlace; dest: DraftPlace; seats: number; at: string };

export const RECENT_MAX = 2;

const key = (userId: string) => `tapiro.rideRecent.${userId}`;

const isRoute = (value: unknown): value is RecentRoute => {
  const route = value as RecentRoute | null;
  return (
    typeof route?.start?.label === 'string' &&
    typeof route.dest?.label === 'string' &&
    typeof route.start.short === 'string' &&
    typeof route.dest.short === 'string' &&
    typeof route.start.latitude === 'number' &&
    typeof route.dest.latitude === 'number' &&
    typeof route.seats === 'number' &&
    typeof route.at === 'string'
  );
};

const sameRoute = (a: RecentRoute, b: RecentRoute) =>
  a.start.label === b.start.label && a.dest.label === b.dest.label;

export function addRecent(routes: readonly RecentRoute[], route: RecentRoute): RecentRoute[] {
  return [route, ...routes.filter((other) => !sameRoute(other, route))].slice(0, RECENT_MAX);
}

export function createRecentRoutes(settings: SettingsLike) {
  const store = {
    list(userId: string): RecentRoute[] {
      const raw = settings.get(key(userId));
      if (typeof raw !== 'string' || raw === '') return [];
      try {
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter(isRoute).slice(0, RECENT_MAX) : [];
      } catch {
        return [];
      }
    },
    add(userId: string, route: RecentRoute) {
      settings.set({ [key(userId)]: JSON.stringify(addRecent(store.list(userId), route)) });
    },
    clear(userId: string) {
      settings.set({ [key(userId)]: '' });
    },
  };
  return store;
}

export type RecentRoutes = ReturnType<typeof createRecentRoutes>;

import type { ResolvedPlace } from 'tapiro-kit';

import { userCleanups } from '@/lib/userCleanups';

export type PlacePurpose = 'post' | 'board';

export function createPlacePick() {
  const picks = new Map<PlacePurpose, ResolvedPlace>();
  return {
    set(purpose: PlacePurpose, place: ResolvedPlace) {
      picks.set(purpose, place);
    },
    take(purpose: PlacePurpose): ResolvedPlace | null {
      const place = picks.get(purpose) ?? null;
      picks.delete(purpose);
      return place;
    },
    clear() {
      picks.clear();
    },
  };
}

export const placePick = createPlacePick();

userCleanups.register(() => placePick.clear());

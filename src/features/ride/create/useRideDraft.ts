import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { isAirport, placePick, shortNameFor, type PlacePurpose } from '@/features/place';
import { createStore } from '@/lib/store';

import { loadShortNames, rideDraftStore } from '../services';
import type { ShortNameRow } from '../types';
import type { DraftPlace, RideDraft } from './draft';
import type { RideDraftError } from './validate';

export type RideFormNotice = RideDraftError | 'alreadySent';

export const rideFormError = createStore<RideFormNotice | null>(null);

export function useRideFormError() {
  return useSyncExternalStore(rideFormError.subscribe, rideFormError.get);
}

export function useRideDraft(userId: string) {
  return useSyncExternalStore(rideDraftStore.subscribe, () => rideDraftStore.load(userId));
}

export function editDraft(userId: string, patch: Partial<RideDraft>) {
  rideDraftStore.update(userId, patch);
  rideFormError.set(null);
}

export function useShortNames() {
  const [rows, setRows] = useState<ShortNameRow[]>([]);
  useEffect(() => {
    let live = true;
    void loadShortNames().then((loaded) => {
      if (live) setRows(loaded);
    });
    return () => {
      live = false;
    };
  }, []);
  return rows;
}

const PURPOSES: Record<'start' | 'dest', PlacePurpose> = { start: 'rideStart', dest: 'rideDest' };

function autoPlace(place: DraftPlace, rows: readonly ShortNameRow[]): DraftPlace {
  return place.shortEdited ? place : { ...place, short: shortNameFor(place.label, rows) };
}

export function usePickedPlaces(userId: string, rows: readonly ShortNameRow[]) {
  useFocusEffect(
    useCallback(() => {
      const draft = rideDraftStore.load(userId);
      const patch: Partial<RideDraft> = {};
      for (const which of ['start', 'dest'] as const) {
        const pick = placePick.take(PURPOSES[which]);
        if (!pick) continue;
        patch[which] = {
          label: pick.name,
          latitude: pick.latitude,
          longitude: pick.longitude,
          short: shortNameFor(pick.name, rows),
          shortEdited: false,
        };
        if (which === 'dest' && isAirport(pick.name, rows)) patch.airportOpen = true;
      }
      if (Object.keys(patch).length > 0) editDraft(userId, patch);
      else if (draft.start || draft.dest) {
        const start = draft.start && autoPlace(draft.start, rows);
        const dest = draft.dest && autoPlace(draft.dest, rows);
        if (start?.short !== draft.start?.short || dest?.short !== draft.dest?.short) {
          rideDraftStore.update(userId, { start, dest });
        }
      }
    }, [userId, rows]),
  );
}

import { randomUUID } from 'expo-crypto';
import { Settings } from 'react-native';

import { deviceCurrency } from '@/lib/deviceCurrency';
import { getSupabase } from '@/lib/supabase';
import { uiVerify, uiVerifyArgument, uiVerifyFixture } from '@/lib/uiVerify';
import { userCleanups } from '@/lib/userCleanups';

import { createRideDraftStore, isEmptyDraft } from './create/draft';
import { createRecentRoutes } from './create/recentRoutes';
import { fixtureRecentRoutes, fixtureRideDraft } from './fixtureCreate';
import { createFixtureRideService, fixtureRideOptions } from './fixtureRideService';
import { createSupabaseRideService } from './rideService';
import type { RideService, RideSummary, ShortNameRow } from './types';

export const FIXTURE_RIDE_USER_ID = '00000000-0000-4000-8000-000000000001';
const PUBLISHED_KEY = 'uiVerifyRidePublishedArgs';

function verifyRideService() {
  Settings.set({ [PUBLISHED_KEY]: '' });
  return createFixtureRideService(fixtureRideOptions(uiVerifyArgument, uiVerifyFixture), (args) =>
    Settings.set({ [PUBLISHED_KEY]: JSON.stringify(args) }),
  );
}

export const rideService: RideService = uiVerify
  ? verifyRideService()
  : createSupabaseRideService(getSupabase(), deviceCurrency);

export const rideDraftStore = createRideDraftStore(Settings, randomUUID, deviceCurrency);

export const recentRoutes = createRecentRoutes(Settings);

userCleanups.register((userId) => {
  rideDraftStore.clear(userId);
  recentRoutes.clear(userId);
});

if (uiVerify) {
  rideDraftStore.clear(FIXTURE_RIDE_USER_ID);
  recentRoutes.clear(FIXTURE_RIDE_USER_ID);
  for (const route of fixtureRecentRoutes(uiVerifyArgument('uiVerifyRideRecent')).reverse()) {
    recentRoutes.add(FIXTURE_RIDE_USER_ID, route);
  }
  const seeded = fixtureRideDraft(uiVerifyArgument('uiVerifyRideDraft'), randomUUID());
  if (seeded) rideDraftStore.update(FIXTURE_RIDE_USER_ID, seeded);
}

let shortNameRows: Promise<ShortNameRow[]> | null = null;

export function loadShortNames() {
  shortNameRows ??= rideService.shortNames().catch(() => {
    shortNameRows = null;
    return [];
  });
  return shortNameRows;
}

const shown = new Map<string, RideSummary>();

export const rideCache = {
  remember(rides: readonly RideSummary[]) {
    for (const ride of rides) shown.set(ride.id, ride);
  },
  get: (id: string) => shown.get(id) ?? null,
};

userCleanups.register(() => shown.clear());

let closeSheet: (() => void) | null = null;

export function registerRideSheet(close: () => void) {
  closeSheet = close;
  return () => {
    if (closeSheet === close) closeSheet = null;
  };
}

export function hasRideDraft(userId: string) {
  return !isEmptyDraft(rideDraftStore.load(userId));
}

export function closeRideSheet() {
  const close = closeSheet;
  closeSheet = null;
  close?.();
  return close !== null;
}

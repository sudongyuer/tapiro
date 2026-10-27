import { uiVerify, uiVerifyArgument } from '@/lib/uiVerify';

import { expoLocationService } from './expoLocationService';
import { createFixtureLocationService, locationFixture } from './fixtureLocationService';
import type { LocationService } from './types';

export const locationService: LocationService = uiVerify
  ? createFixtureLocationService(locationFixture(uiVerifyArgument('uiVerifyLocation')))
  : expoLocationService;

export type { LocationPermission, LocationService, PermissionState, Point } from './types';

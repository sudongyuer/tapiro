import * as Location from 'expo-location';

import { createLocationService } from './createLocationService';

export const expoLocationService = createLocationService({
  getForegroundPermissionsAsync: Location.getForegroundPermissionsAsync,
  requestForegroundPermissionsAsync: Location.requestForegroundPermissionsAsync,
  getLastKnownPositionAsync: Location.getLastKnownPositionAsync,
  getCurrentPositionAsync: () =>
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
});

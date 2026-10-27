export type LocationPermission = 'undetermined' | 'granted' | 'denied';
export type Point = { latitude: number; longitude: number };
export type PermissionState = { status: LocationPermission; reduced: boolean };
export type LocationService = {
  permission(): Promise<PermissionState>;
  request(): Promise<PermissionState>;
  currentPoint(): Promise<Point | null>;
};

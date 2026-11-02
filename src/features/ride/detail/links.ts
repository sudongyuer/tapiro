import type { Point } from '@/lib/location';

export const GRAB_HOME_URL = 'grab://open?screenType=MAIN';

export function walkingDirectionsUrl(point: Point) {
  return `https://maps.apple.com/directions?destination=${point.latitude},${point.longitude}&mode=walking`;
}

import type { Point } from '@/lib/location/types';

export type NoOriginReason = 'undetermined' | 'declined' | 'denied' | 'noFix';

export type BoardOrigin =
  | { kind: 'me'; point: Point }
  | { kind: 'place'; point: Point; label: string }
  | { kind: 'none'; reason: NoOriginReason };

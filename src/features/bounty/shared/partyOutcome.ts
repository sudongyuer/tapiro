import type { ViewerRole } from '../board/types';

const UNDERWAY = ['assigned', 'en_route', 'done', 'disputed', 'confirmed', 'settled'];

export type PartyOutcome = 'selected' | 'cancelled' | null;

export function partyOutcome(status: string): PartyOutcome {
  if (status === 'cancelled') return 'cancelled';
  return UNDERWAY.includes(status) ? 'selected' : null;
}

export const showsProgress = (role: ViewerRole, status: string) =>
  (role === 'poster' || role === 'helper') && partyOutcome(status) !== null;

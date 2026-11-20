import type { BountyDetail } from '../board/types';
import { closedForChoosing } from '../select/applicantsView';

const STEPS = {
  assigned: 'assigned',
  en_route: 'enRoute',
  done: 'done',
  disputed: 'disputed',
  confirmed: 'confirmed',
  settled: 'settled',
} as const;

export type OwnStep = (typeof STEPS)[keyof typeof STEPS];

export type OwnState =
  | { kind: 'open' }
  | { kind: 'closed' }
  | { kind: 'underway'; step: OwnStep; helper: string | null };

export function ownState(detail: BountyDetail, now: Date): OwnState | null {
  if (detail.viewerRole !== 'poster' || detail.status === 'cancelled') return null;
  const step = STEPS[detail.status as keyof typeof STEPS];
  if (step) return { kind: 'underway', step, helper: detail.helper?.name ?? null };
  return closedForChoosing(detail, now) ? { kind: 'closed' } : { kind: 'open' };
}

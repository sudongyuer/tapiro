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

export type OwnStep = (typeof STEPS)[keyof typeof STEPS] | 'late';

export type OwnState =
  | { kind: 'open' }
  | { kind: 'closed' }
  | { kind: 'underway'; step: OwnStep; helper: string | null };

// Same rule as the server's `startLate`, so the detail and the status screen name one state.
const startLate = (detail: BountyDetail, now: Date) =>
  detail.status === 'assigned' &&
  detail.startsAt !== null &&
  Date.parse(detail.startsAt) <= now.getTime();

export function ownState(detail: BountyDetail, now: Date): OwnState | null {
  if (detail.viewerRole !== 'poster') return null;
  const step = STEPS[detail.status as keyof typeof STEPS];
  if (step) {
    const helper = detail.helper?.name ?? null;
    return { kind: 'underway', step: startLate(detail, now) ? 'late' : step, helper };
  }
  if (detail.status === 'closed') return { kind: 'closed' };
  if (detail.status === 'open') {
    return closedForChoosing(detail, now) ? { kind: 'closed' } : { kind: 'open' };
  }
  return null;
}

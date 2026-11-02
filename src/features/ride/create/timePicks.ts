import { GATHER_BEFORE_MS } from '../rideTimes';

const STEP_MS = 30 * 60_000;
export const PICK_LEAD_MS = 30 * 60_000;
export const CUSTOM_LEAD_MS = 60 * 60_000;

const roundUp = (time: number) => Math.ceil(time / STEP_MS) * STEP_MS;

export function quickPicks(now: number): [number, number] {
  const soon = roundUp(now + PICK_LEAD_MS);
  return [soon, soon + STEP_MS];
}

export function customStart(now: number) {
  return roundUp(now + CUSTOM_LEAD_MS);
}

export const gatherTime = (departs: number) => departs - GATHER_BEFORE_MS;

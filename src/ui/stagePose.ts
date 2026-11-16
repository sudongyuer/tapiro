import { vars } from './theme/tokens';

export type StageState = 'urgent' | 'live' | 'calm';

export const STAGE_HEIGHT = 200;
export const CAR_OVERHANG = 30;
export const BUBBLE_TAIL = 8;
export const BUBBLE_LEFT = vars['--space-4'];
export const BUBBLE_PADDING = { vertical: vars['--space-2'], horizontal: vars['--space-3'] };
export const BUBBLE_MAX_LINES = 4;

const BUBBLE_TOP = 18;
const BUBBLE_GAP = vars['--space-2'];
const BUBBLE_ROOMY_LINES = 3;
const BUBBLE_ROOMY_HEIGHT =
  BUBBLE_ROOMY_LINES * vars['--text-secondary--line-height'] + 2 * BUBBLE_PADDING.vertical;

// Anchored by its bottom: up to three lines start 18 pt under the stage top; a fourth grows upward, because the
// front live card begins 14 pt under a three-line bubble.
export const BUBBLE_SLOT = {
  bottom: STAGE_HEIGHT - BUBBLE_TOP - BUBBLE_ROOMY_HEIGHT,
  minHeight: BUBBLE_ROOMY_HEIGHT,
};

export const POSE: Record<
  StageState,
  { size: number; right: number; top: number; sunTop: number }
> = {
  urgent: { size: 96, right: 58, top: -8, sunTop: -60 },
  live: { size: 86, right: 54, top: 2, sunTop: -54 },
  calm: { size: 96, right: 58, top: -8, sunTop: 10 },
};

export function bubbleMaxWidth(state: StageState, stageWidth: number) {
  const pose = POSE[state];
  const actorLeft = stageWidth - pose.right - pose.size - (state === 'live' ? CAR_OVERHANG : 0);
  return actorLeft - BUBBLE_TAIL - BUBBLE_GAP - BUBBLE_LEFT;
}

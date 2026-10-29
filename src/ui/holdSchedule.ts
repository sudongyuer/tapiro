export type HoldImpact = 'light' | 'medium' | 'heavy';

export const HOLD_FILL_MS = 1000;
export const HOLD_RUN_BACK_MS = 200;
export const HOLD_PRESS_IMPACT: HoldImpact = 'light';

const TICKS: readonly { at: number; impact: HoldImpact }[] = [
  { at: 0.25, impact: 'light' },
  { at: 0.5, impact: 'medium' },
  { at: 0.75, impact: 'medium' },
  { at: 1, impact: 'heavy' },
];

export function holdFillMs(from: number) {
  'worklet';
  return Math.max(0, 1 - from) * HOLD_FILL_MS;
}

export function holdRunBackMs(reduceMotion: boolean) {
  'worklet';
  return reduceMotion ? 0 : HOLD_RUN_BACK_MS;
}

export function holdCrossing(previous: number, next: number) {
  'worklet';
  const impacts: HoldImpact[] = [];
  for (const tick of TICKS) {
    if (previous < tick.at && next >= tick.at) impacts.push(tick.impact);
  }
  return { impacts, complete: previous < 1 && next >= 1 };
}

export type HoldTrack = { holding: boolean; completed: boolean; progress: number };

export const HOLD_IDLE: HoldTrack = { holding: false, completed: false, progress: 0 };

export function holdPress(track: HoldTrack) {
  'worklet';
  const from = track.completed ? 0 : track.progress;
  return { from, track: { holding: true, completed: false, progress: from } };
}

export function holdRelease(track: HoldTrack): HoldTrack {
  'worklet';
  return { ...track, holding: false };
}

export function holdFrame(track: HoldTrack, next: number) {
  'worklet';
  if (!track.holding) {
    return { track: { ...track, progress: next }, impacts: [] as HoldImpact[], complete: false };
  }
  const { impacts, complete } = holdCrossing(track.progress, next);
  return {
    track: { holding: true, completed: track.completed || complete, progress: next },
    impacts,
    complete,
  };
}

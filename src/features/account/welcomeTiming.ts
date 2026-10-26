export const POP_DURATION = 520;
export const PANEL_DELAY = 900;
export const DRIFT_CYCLES = 2;
export const BREATH_CYCLES = 4;

export function loopEndMs(delay: number, period: number, cycles: number) {
  return delay + POP_DURATION + period * cycles;
}

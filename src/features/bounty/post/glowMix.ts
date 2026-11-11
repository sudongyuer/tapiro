import { vars } from '@/ui/theme/tokens';

const HOLD_MS = vars['--duration-filled-hold'];
const FADE_MS = vars['--duration-filled-fade'];
export const FADE_STEPS = 8;

const easeOut = (t: number) => 1 - (1 - t) ** 2;

export function glowMix(elapsedMs: number, reduced: boolean) {
  if (elapsedMs < 0) return 1;
  if (reduced) return elapsedMs < HOLD_MS + FADE_MS ? 1 : 0;
  if (elapsedMs < HOLD_MS) return 1;
  const t = Math.min(1, (elapsedMs - HOLD_MS) / FADE_MS);
  return 1 - easeOut(t);
}

export function blend(from: string, to: string, mix: number) {
  const channel = (hex: string, at: number) => parseInt(hex.slice(at, at + 2), 16);
  const parts = [1, 3, 5].map((at) =>
    Math.round(channel(to, at) + (channel(from, at) - channel(to, at)) * mix)
      .toString(16)
      .padStart(2, '0'),
  );
  return `#${parts.join('')}`;
}

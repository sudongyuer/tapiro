import { listRowBackground } from '@expo/ui/swift-ui/modifiers';
import { createContext, useContext, useEffect, useState } from 'react';
import { PlatformColor } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { uiVerifyReduceMotion } from '@/lib/uiVerify';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import type { FilledRow } from './aiFill';
import { blend, FADE_STEPS, glowMix } from './glowMix';

const HOLD_MS = vars['--duration-filled-hold'];
const FADE_MS = vars['--duration-filled-fade'];

export type FillGlow = { rows: readonly FilledRow[]; mix: number };

const NO_GLOW: FillGlow = { rows: [], mix: 0 };

export const FillGlowContext = createContext<FillGlow>(NO_GLOW);

// SwiftUI does not animate a list row's background, so the fade is stepped from JS: the row colour is blended with
// the glow a few times over the fade, then the row gets its system colour back. Under Reduce Motion it goes out at once.
export function useFillGlow(rows: readonly FilledRow[] | null, at: number | null): FillGlow {
  const reduced = useReducedMotion() || uiVerifyReduceMotion;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (at === null) return;
    const step = reduced ? HOLD_MS + FADE_MS : FADE_MS / FADE_STEPS;
    const timer = setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (time - at >= HOLD_MS + FADE_MS) clearInterval(timer);
    }, step);
    return () => clearInterval(timer);
  }, [at, reduced]);
  if (rows === null || at === null) return NO_GLOW;
  return { rows, mix: glowMix(now - at, reduced) };
}

export function useRowGlow(row: FilledRow) {
  const glow = useContext(FillGlowContext);
  const { color } = useTheme();
  if (!glow.rows.includes(row)) return [];
  if (glow.mix === 0) return [listRowBackground(PlatformColor('secondarySystemGroupedBackground'))];
  const fill = blend(color('--color-filled-glow'), color('--color-filled-row'), glow.mix);
  return [listRowBackground(fill)];
}

import { animation, Animation, listRowBackground } from '@expo/ui/swift-ui/modifiers';
import { createContext, useContext, useEffect, useState } from 'react';
import { PlatformColor } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { uiVerifyReduceMotion } from '@/lib/uiVerify';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import type { FilledRow } from './aiFill';

const HOLD_MS = vars['--duration-filled-hold'];
const FADE_MS = vars['--duration-filled-fade'];

export type FillGlow = { rows: readonly FilledRow[]; lit: boolean; reduced: boolean };

const NO_GLOW: FillGlow = { rows: [], lit: false, reduced: true };

export const FillGlowContext = createContext<FillGlow>(NO_GLOW);

// Under Reduce Motion the rows stay lit for the whole 1.2 s and go out at once, with no fade.
export function useFillGlow(rows: readonly FilledRow[] | null, at: number | null): FillGlow {
  const reduced = useReducedMotion() || uiVerifyReduceMotion;
  const [ended, setEnded] = useState<number | null>(null);
  useEffect(() => {
    if (at === null) return;
    const left = at + (reduced ? HOLD_MS + FADE_MS : HOLD_MS) - Date.now();
    const timer = setTimeout(() => setEnded(at), Math.max(0, left));
    return () => clearTimeout(timer);
  }, [at, reduced]);
  return rows === null || at === null ? NO_GLOW : { rows, lit: ended !== at, reduced };
}

export function useRowGlow(row: FilledRow) {
  const glow = useContext(FillGlowContext);
  const { color } = useTheme();
  if (!glow.rows.includes(row)) return [];
  const fill = glow.lit
    ? color('--color-filled-glow')
    : PlatformColor('secondarySystemGroupedBackground');
  return [
    listRowBackground(fill),
    ...(glow.reduced ? [] : [animation(Animation.easeOut({ duration: FADE_MS / 1000 }), glow.lit)]),
  ];
}

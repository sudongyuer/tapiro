import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { vars } from '@/ui/theme/tokens';

const SETTLE = { duration: vars['--duration-settle'], dampingRatio: 0.8 } as const;

export function useLiveStackState() {
  const [open, setOpenState] = useState(false);
  return {
    open,
    setOpen: (next: boolean) => {
      if (next === open) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      setOpenState(next);
    },
  };
}

export function useStackProgress(open: boolean) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(open ? 1 : 0);
  useEffect(() => {
    const target = open ? 1 : 0;
    progress.set(reduceMotion ? target : withSpring(target, SETTLE));
  }, [open, reduceMotion, progress]);
  return progress;
}

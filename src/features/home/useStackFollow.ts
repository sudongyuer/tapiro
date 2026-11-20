import { useLayoutEffect, useState } from 'react';
import { useSharedValue, withSpring } from 'react-native-reanimated';

import { vars } from '@/ui/theme/tokens';

import { holdStack, type HeldStack } from './stackLayout';

export const RESTACK = { duration: vars['--duration-settle'], dampingRatio: 0.8 } as const;
export const RESTACK_FADE = { ...RESTACK, overshootClamping: true } as const;

export function useStackFollow(height: number, ready: boolean, open: boolean, animate: boolean) {
  const [held, setHeld] = useState<HeldStack>({ height: ready ? height : 0, open, shift: 0 });
  const next = holdStack(held, height, ready, open, animate);
  if (next !== held) setHeld(next);
  const offset = useSharedValue(0);
  useLayoutEffect(() => {
    if (held.shift === 0) {
      offset.set(0);
      return;
    }
    offset.set(offset.get() + held.shift);
    offset.set(withSpring(0, RESTACK));
  }, [held, offset]);
  return { height: held.height, offset };
}

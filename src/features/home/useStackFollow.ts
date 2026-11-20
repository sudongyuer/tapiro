import { useLayoutEffect, useState } from 'react';
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated';

import { holdStack, type HeldStack } from './stackLayout';

export const RESTACK = { duration: 420, easing: Easing.bezier(0.2, 0.9, 0.3, 1) };

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
    offset.set(withTiming(0, RESTACK));
  }, [held, offset]);
  return { height: held.height, offset };
}

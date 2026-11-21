import { useNativeState } from '@expo/ui/swift-ui';
import { symbolEffect } from '@expo/ui/swift-ui/modifiers';
import { useEffect, useRef } from 'react';

import { useMotionReduced } from '@/ui/theme/motion';

const BOUNCE = { effect: 'bounce' } as const;

export function useDoneBounce(done: boolean) {
  const reduced = useMotionReduced();
  const trigger = useNativeState(0);
  const was = useRef(done);

  useEffect(() => {
    if (done && !was.current && !reduced) {
      trigger.set(trigger.get() + 1);
    }
    was.current = done;
  }, [done, reduced, trigger]);

  return symbolEffect(BOUNCE, { value: trigger });
}

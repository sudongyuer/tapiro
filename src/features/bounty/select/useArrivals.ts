import { animation, Animation, offset, opacity } from '@expo/ui/swift-ui/modifiers';
import { useCallback, useEffect, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { uiVerifyReduceMotion } from '@/lib/uiVerify';
import { vars } from '@/ui/theme/tokens';

import { arrivedIds } from './arrivals';

const ease = Animation.easeOut({ duration: vars['--duration-settle'] / 1000 });
const RISE = 8;

type Arrival = { ids: ReadonlySet<string>; phase: 'from' | 'to'; count: number };

export function useArrivals(ids: readonly string[] | null) {
  const reduced = useReducedMotion() || uiVerifyReduceMotion;
  const key = ids?.join('\n') ?? null;
  const [known, setKnown] = useState<{ key: string | null; ids: readonly string[] | null }>({
    key,
    ids,
  });
  const [arrival, setArrival] = useState<Arrival>({ ids: new Set(), phase: 'to', count: 0 });

  if (key !== known.key && ids) {
    setKnown({ key, ids });
    const fresh = arrivedIds(known.ids, ids);
    if (fresh.length > 0) {
      setArrival((last) => ({ ids: new Set(fresh), phase: 'from', count: last.count }));
    }
  }

  useEffect(() => {
    if (arrival.phase !== 'from') return;
    // SwiftUI has to receive the hidden pose in its own update before the keyed change animates it.
    const frame = requestAnimationFrame(() =>
      setArrival((last) => ({ ...last, phase: 'to', count: last.count + 1 })),
    );
    return () => cancelAnimationFrame(frame);
  }, [arrival.phase]);

  return useCallback(
    (id: string) => {
      if (!arrival.ids.has(id)) return [];
      const hidden = arrival.phase === 'from';
      return [
        opacity(hidden ? 0 : 1),
        offset({ y: hidden && !reduced ? RISE : 0 }),
        animation(ease, arrival.count),
      ];
    },
    [arrival, reduced],
  );
}

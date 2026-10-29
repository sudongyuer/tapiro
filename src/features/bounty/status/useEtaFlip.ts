import { animation, Animation, offset, opacity } from '@expo/ui/swift-ui/modifiers';
import { useEffect, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

const FLIP_SECONDS = 0.22;
const FLIP_FROM_Y = -8;
const ease = Animation.easeOut({ duration: FLIP_SECONDS });

type Flip = { phase: 'from' | 'to'; count: number };

export function useEtaFlip(etaAt: string | null) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(etaAt);
  const [flip, setFlip] = useState<Flip>({ phase: 'to', count: 0 });

  if (etaAt !== shown) {
    setShown(etaAt);
    if (!reduced && shown && etaAt) setFlip((last) => ({ phase: 'from', count: last.count }));
  }

  useEffect(() => {
    if (flip.phase !== 'from') return;
    // The start pose has to reach SwiftUI in its own update; the animated change is keyed on the count.
    const frame = requestAnimationFrame(() =>
      setFlip((last) => ({ phase: 'to', count: last.count + 1 })),
    );
    return () => cancelAnimationFrame(frame);
  }, [flip.phase]);

  const from = flip.phase === 'from';
  return {
    eta: [
      offset({ y: from ? FLIP_FROM_Y : 0 }),
      opacity(from ? 0 : 1),
      animation(ease, flip.count),
    ],
    previous: [opacity(from ? 0 : 1), animation(ease, flip.count)],
  };
}

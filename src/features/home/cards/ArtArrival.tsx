import { useEffect, useState, type ReactNode } from 'react';
import Animated, {
  Extrapolation,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { takeArrival } from '@/lib/handArt';
import { uiVerifyReduceMotion } from '@/lib/uiVerify';

const AFTER_SHEET_MS = 300;
const DROP = { duration: 600, dampingRatio: 0.55, reduceMotion: ReduceMotion.Never } as const;
const FADE = { duration: 200, reduceMotion: ReduceMotion.Never } as const;
const FROM = { y: -140, scale: 0.6, turn: -14 };

export function ArtArrival({ bountyId, children }: { bountyId: string; children: ReactNode }) {
  const reduceMotion = useReducedMotion() || uiVerifyReduceMotion;
  const [arriving] = useState(() => takeArrival(bountyId));
  const progress = useSharedValue(arriving ? 0 : 1);

  useEffect(() => {
    if (!arriving) return;
    progress.set(
      withDelay(AFTER_SHEET_MS, reduceMotion ? withTiming(1, FADE) : withSpring(1, DROP)),
    );
  }, [arriving, progress, reduceMotion]);

  const style = useAnimatedStyle(() => {
    const p = progress.get();
    const opacity = interpolate(p, [0, 0.2], [0, 1], Extrapolation.CLAMP);
    if (reduceMotion) return { opacity };
    const rest = 1 - p;
    return {
      opacity,
      transform: [
        { translateY: rest * FROM.y },
        { scale: 1 + rest * FROM.scale },
        { rotate: `${rest * FROM.turn}deg` },
      ],
    };
  });

  return <Animated.View style={style}>{children}</Animated.View>;
}

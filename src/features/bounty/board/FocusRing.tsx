import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

export const RING_HOLD_MS = 1200;
const RING_WIDTH = 2;
const RING_GAP = 2;
const OUTSET = RING_WIDTH + RING_GAP;
const NEVER = ReduceMotion.Never;

export function FocusRing({ ringKey, onDone }: { ringKey: number; onDone: (key: number) => void }) {
  const { color } = useTheme();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  useEffect(() => {
    const fadeIn = reduceMotion ? 0 : vars['--duration-fade'];
    const fadeOut = reduceMotion ? 0 : vars['--duration-settle'];
    opacity.set(
      withSequence(
        NEVER,
        withTiming(1, { duration: fadeIn, reduceMotion: NEVER }),
        withDelay(
          RING_HOLD_MS,
          withTiming(0, { duration: fadeOut, reduceMotion: NEVER }, (finished) => {
            if (finished) scheduleOnRN(onDone, ringKey);
          }),
          NEVER,
        ),
      ),
    );
  }, [opacity, reduceMotion, onDone, ringKey]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.ring, { borderColor: color('--color-accent') }, style]}
    />
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    top: -OUTSET,
    left: -OUTSET,
    right: -OUTSET,
    bottom: -OUTSET,
    borderWidth: RING_WIDTH,
    borderRadius: vars['--radius-card'] + OUTSET,
    borderCurve: 'continuous',
  },
});

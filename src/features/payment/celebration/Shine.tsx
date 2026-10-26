import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { useTheme } from '@/ui/theme/useTheme';

import { tween, type Curve } from './timeline';
import type { Clock } from './useCelebrationClock';

const WIDTH = 40;

export function Shine({
  clock,
  segment,
  travel,
  skew = false,
}: {
  clock: Clock;
  segment: { start: number; duration: number; curve: Curve };
  travel: number;
  skew?: boolean;
}) {
  const { color } = useTheme();
  const clear = color('--color-shine-clear');
  const sweep = useAnimatedStyle(() => {
    const p = tween(clock.value, segment, 0, 1);
    return {
      opacity: p > 0 && p < 1 ? 1 : 0,
      transform: [
        { translateX: -travel + 2 * travel * p },
        skew ? { skewX: '-20deg' } : { rotate: '20deg' },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.bar,
        {
          experimental_backgroundImage: `linear-gradient(90deg, ${clear}, ${color('--color-shine')}, ${clear})`,
          mixBlendMode: skew ? 'overlay' : 'soft-light',
        },
        sweep,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: -30,
    bottom: -30,
    left: '50%',
    width: WIDTH,
    marginLeft: -WIDTH / 2,
  },
});

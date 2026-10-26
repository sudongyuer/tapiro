import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { Mascot } from '@/ui/Mascot';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { EASE_OUT, keyframes, TIMELINE, tween } from './timeline';
import type { Clock } from './useCelebrationClock';

const MASCOT = 96;
export const TAPIR_RISE = MASCOT * 0.8;
const HOP = [0, 0.14, 0.4, 0.62, 0.8, 1];
const HOP_CURVES = ['linear', 'linear', [0.5, 0, 0.8, 0.6], 'linear', 'linear'] as const;
const BLUSH_SCALE = MASCOT / 64;
const CHEEKS = [16.4, 47.6];

export function BookTapir({ clock, first }: { clock: Clock; first: boolean }) {
  const { color } = useTheme();
  const rise = useAnimatedStyle(() => ({
    transform: [{ translateY: tween(clock.value, TIMELINE.tapirIn, 90, 0) }],
  }));
  const hop = useAnimatedStyle(() => {
    const t = clock.value;
    if (!first) {
      const { start, duration } = TIMELINE.nod;
      return {
        transform: [
          { translateY: keyframes(t, start, duration, [0, 0.3, 0.6, 1], [0, -10, 0, 0]) },
        ],
      };
    }
    const { start, duration } = TIMELINE.hop;
    return {
      transform: [
        { translateY: keyframes(t, start, duration, HOP, [0, 0, -26, 0, 0, 0], HOP_CURVES) },
        { scaleX: keyframes(t, start, duration, HOP, [1, 1.08, 0.95, 1.07, 1, 1], HOP_CURVES) },
        { scaleY: keyframes(t, start, duration, HOP, [1, 0.9, 1.06, 0.92, 1, 1], HOP_CURVES) },
      ],
    };
  });
  const blush = useAnimatedStyle(() => {
    const { start, duration } = TIMELINE.blush;
    return {
      transform: [
        {
          scale: first
            ? keyframes(clock.value, start, duration, [0, 0.3, 1], [1, 1.6, 1.15], EASE_OUT)
            : 1,
        },
      ],
    };
  });
  return (
    <Animated.View style={[styles.tapir, rise]}>
      <Animated.View style={[styles.hop, hop]}>
        <Mascot variant="front" size={MASCOT} outlined />
        {first
          ? CHEEKS.map((x) => (
              <Animated.View
                key={x}
                style={[
                  styles.cheek,
                  {
                    left: (x - 3.84) * BLUSH_SCALE,
                    backgroundColor: color('--color-mascot-blush'),
                  },
                  blush,
                ]}
              />
            ))
          : null}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tapir: { position: 'absolute', right: vars['--space-2'], top: -TAPIR_RISE },
  hop: { transformOrigin: 'bottom' },
  cheek: {
    position: 'absolute',
    top: (42 - 2.64) * BLUSH_SCALE,
    width: 7.68 * BLUSH_SCALE,
    height: 5.28 * BLUSH_SCALE,
    borderRadius: 6 * BLUSH_SCALE,
    opacity: 0.9,
  },
});

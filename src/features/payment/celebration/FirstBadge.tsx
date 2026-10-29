import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { AppText } from '@/ui/AppText';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { keyframes, TIMELINE } from './timeline';
import type { Clock } from './useCelebrationClock';

// Drawn in the top layer after the flying sticker, which stays on screen over the book once it lands.
export function FirstBadge({
  clock,
  label,
  x,
  y,
  scale,
}: {
  clock: Clock;
  label: string;
  x: number;
  y: number;
  scale: number;
}) {
  const { color } = useTheme();
  const pop = useAnimatedStyle(() => {
    const { start, duration, curve } = TIMELINE.badge;
    const t = clock.value;
    const at = (values: number[]) => keyframes(t, start, duration, [0, 0.6, 1], values, curve);
    return {
      opacity: at([0, 1, 1]),
      transform: [{ scale: at([0.2, 1.12, 1]) }, { rotate: `${at([-30, 6, -8])}deg` }],
    };
  });
  return (
    <View style={[styles.place, { left: x, top: y, transform: [{ scale }] }]} pointerEvents="none">
      <Animated.View
        style={[
          styles.badge,
          {
            backgroundColor: color('--color-paper-green'),
            borderColor: color('--color-sticker-border'),
            shadowColor: color('--color-sticker-shadow'),
          },
          pop,
        ]}
        testID="pay-celebration-badge"
        accessible
        accessibilityLabel={label}
      >
        <AppText variant="meta" style={[styles.heavy, { color: color('--color-sticker-border') }]}>
          {label}
        </AppText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  place: { position: 'absolute', transformOrigin: 'left top' },
  badge: {
    borderWidth: 2.5,
    borderRadius: vars['--radius-chip'],
    paddingHorizontal: vars['--space-2'],
    paddingVertical: 2,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 3,
  },
  heavy: { fontWeight: '800' },
});

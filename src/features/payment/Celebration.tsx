import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { PlatformColor, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

const TICK = 96;
const SPARKS = 8;
const SPARK_DISTANCE = 112;
const POP = { duration: vars['--duration-peel'], dampingRatio: 0.6 } as const;

export function Celebration({
  title,
  body,
  onDone,
}: {
  title: string;
  body: string;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const reduceMotion = useReducedMotion();
  const pop = useSharedValue(0);
  const burst = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      pop.set(withTiming(1, { duration: vars['--duration-fade'] }));
      return;
    }
    pop.set(withSpring(1, POP));
    burst.set(
      withDelay(vars['--duration-press'], withTiming(1, { duration: vars['--duration-peel'] * 2 })),
    );
  }, [reduceMotion, pop, burst]);

  const tickStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.value * 1.5),
    transform: reduceMotion ? [] : [{ scale: 0.5 + pop.value * 0.5 }],
  }));

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.screen]}
      testID="pay-celebration"
      accessibilityViewIsModal
    >
      <View style={styles.center}>
        <View style={styles.burst}>
          {reduceMotion
            ? null
            : Array.from({ length: SPARKS }, (_, index) => (
                <Spark
                  key={index}
                  index={index}
                  burst={burst}
                  tint={color('--color-sticker-pickup')}
                />
              ))}
          <Animated.View
            style={[styles.tick, { backgroundColor: color('--color-success') }, tickStyle]}
          >
            <SymbolView
              name="checkmark"
              size={TICK / 2}
              weight="bold"
              tintColor={color('--color-on-accent')}
            />
          </Animated.View>
        </View>
        <AppText variant="moment-title" style={styles.text} accessibilityRole="header">
          {title}
        </AppText>
        <AppText variant="body" tone="secondaryLabel" style={styles.text}>
          {body}
        </AppText>
      </View>
      <View style={styles.footer}>
        <PillButton
          label={t('pay.celebrate.done')}
          onPress={onDone}
          testID="pay-celebration-done"
        />
      </View>
    </View>
  );
}

function Spark({
  index,
  burst,
  tint,
}: {
  index: number;
  burst: ReturnType<typeof useSharedValue<number>>;
  tint: string;
}) {
  const angle = (index / SPARKS) * Math.PI * 2;
  const style = useAnimatedStyle(() => ({
    opacity: burst.value > 0 ? 1 - burst.value : 0,
    transform: [
      { translateX: Math.cos(angle) * SPARK_DISTANCE * burst.value },
      { translateY: Math.sin(angle) * SPARK_DISTANCE * burst.value },
      { scale: 0.6 + burst.value * 0.6 },
    ],
  }));
  return (
    <Animated.View style={[styles.spark, style]} pointerEvents="none">
      <SymbolView name={index % 2 ? 'sparkle' : 'star.fill'} size={18} tintColor={tint} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: PlatformColor('systemBackground'), zIndex: 10 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: vars['--space-4'],
    padding: vars['--space-5'],
  },
  burst: { width: TICK, height: TICK, alignItems: 'center', justifyContent: 'center' },
  tick: {
    width: TICK,
    height: TICK,
    borderRadius: TICK / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spark: { position: 'absolute' },
  text: { textAlign: 'center' },
  footer: { paddingHorizontal: vars['--space-5'], paddingBottom: vars['--space-7'] },
});

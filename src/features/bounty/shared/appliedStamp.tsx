import * as Haptics from 'expo-haptics';
import { useIsFocused } from 'expo-router';
import { useLayoutEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useI18n } from '@/lib/i18n';
import type { BountyCategory } from '@/lib/stickers/category';
import { AppText } from '@/ui/AppText';
import { CategorySticker } from '@/ui/CategorySticker';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { justApplied, type ApplySurface } from './justApplied';

const STAMP_TILT = -12;
const STAMP_RADIUS = 6;
const STAMP_TRACKING = 1;
const STAMP_MIN_SCALE = 0.6;
const STAMP_FROM = 1.4;
const STAMP_DELAY_MS = 80;
const NEVER = ReduceMotion.Never;
const SPRING = { damping: 14, stiffness: 220, reduceMotion: NEVER } as const;
const TILT = vars['--sticker-rotation-max'];

function landed() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}

function useStampMotion(applied: boolean, id: string, surface: ApplySurface) {
  const focused = useIsFocused();
  const reduceMotion = useReducedMotion();
  const final = applied && !justApplied.has(id, surface);
  const tilt = useSharedValue(final ? TILT : 0);
  const stamp = useSharedValue(final ? 1 : 0);
  const scale = useSharedValue(1);
  const landing = useSharedValue(false);

  useLayoutEffect(() => {
    if (!applied) {
      tilt.set(0);
      stamp.set(0);
      scale.set(1);
      return;
    }
    if (!justApplied.has(id, surface)) {
      tilt.set(TILT);
      stamp.set(1);
      scale.set(1);
      return;
    }
    if (!focused) {
      tilt.set(0);
      stamp.set(0);
      return;
    }
    justApplied.take(id, surface);
    if (reduceMotion) {
      tilt.set(TILT);
      scale.set(1);
      stamp.set(
        withTiming(1, { duration: vars['--duration-fade'], reduceMotion: NEVER }, (done) => {
          if (done) scheduleOnRN(landed);
        }),
      );
      return;
    }
    tilt.set(0);
    stamp.set(0);
    scale.set(STAMP_FROM);
    landing.set(true);
    tilt.set(withSpring(TILT, SPRING));
    stamp.set(withDelay(STAMP_DELAY_MS, withSpring(1, SPRING), NEVER));
    scale.set(withDelay(STAMP_DELAY_MS, withSpring(1, SPRING), NEVER));
  }, [applied, focused, reduceMotion, id, surface, tilt, stamp, scale, landing]);

  useAnimatedReaction(
    () => landing.get() && scale.get() <= 1,
    (now, before) => {
      if (now && !before) {
        landing.set(false);
        scheduleOnRN(landed);
      }
    },
  );

  const sticker = useAnimatedStyle(() => ({ transform: [{ rotate: `${tilt.get()}deg` }] }));
  const mark = useAnimatedStyle(() => ({
    opacity: Math.min(stamp.get(), 1),
    transform: [{ rotate: `${STAMP_TILT}deg` }, { scale: scale.get() }],
  }));
  return { sticker, mark };
}

export function AppliedSticker({
  id,
  surface,
  category,
  size,
  applied,
  testID,
}: {
  id: string;
  surface: ApplySurface;
  category: BountyCategory;
  size: number;
  applied: boolean;
  testID: string;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const motion = useStampMotion(applied, id, surface);
  return (
    <View style={{ width: size, height: size }} accessible={false}>
      <Animated.View style={motion.sticker}>
        <CategorySticker category={category} size={size} />
      </Animated.View>
      {applied ? (
        <View style={styles.stampLane}>
          <Animated.View
            testID={`${testID}-stamp`}
            style={[
              styles.stamp,
              {
                borderColor: color('--color-success'),
                backgroundColor: color('--color-receipt'),
              },
              motion.mark,
            ]}
          >
            <AppText
              variant="meta"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={STAMP_MIN_SCALE}
              style={[styles.stampText, { color: color('--color-success') }]}
            >
              {t('bounty.stamp')}
            </AppText>
          </Animated.View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stampLane: {
    position: 'absolute',
    left: 0,
    right: -vars['--space-2'],
    bottom: -vars['--space-1'],
    alignItems: 'center',
  },
  stamp: {
    borderWidth: vars['--sticker-border-small'],
    borderRadius: STAMP_RADIUS,
    borderCurve: 'continuous',
    paddingHorizontal: vars['--space-1'],
  },
  stampText: { fontWeight: '800', letterSpacing: STAMP_TRACKING },
});

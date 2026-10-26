import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import type { StickerArt } from '@/lib/stickers';
import { AppText } from '@/ui/AppText';
import { EarnedSticker } from '@/ui/EarnedSticker';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { Shine } from './Shine';
import { EASE_OUT, keyframes, TIMELINE, tween } from './timeline';
import type { Clock } from './useCelebrationClock';

export const ART_WIDTH = 170;
export const ART_HEIGHT = (ART_WIDTH * 80) / 96;
export const LANDED_SCALE = 0.42;
export const RECEIPT_HEIGHT = 250;
export const STICKER_OFFSET = 126;
const CURL = 46;
const S = LANDED_SCALE;
const SQUASH = [0, 0.52, 0.58, 0.69, 0.8, 1];
const SQUASH_CURVES = ['linear', EASE_OUT, 'linear', 'linear', 'linear'] as const;

export function Receipt({
  clock,
  top,
  title,
  paid,
  amount,
}: {
  clock: Clock;
  top: number;
  title: string;
  paid: string;
  amount: string;
}) {
  const { color } = useTheme();
  const drop = useAnimatedStyle(() => {
    const p = tween(clock.value, TIMELINE.receipt, 0, 1);
    return {
      opacity: 1 - p,
      transform: [{ translateY: 90 * p }, { rotate: `${3 * p}deg` }, { scale: 1 - 0.06 * p }],
    };
  });
  return (
    <Animated.View
      style={[
        styles.receipt,
        {
          top,
          backgroundColor: color('--color-receipt'),
          shadowColor: color('--color-sticker-shadow'),
        },
        drop,
      ]}
    >
      <AppText variant="meta" style={{ color: color('--color-on-paper-muted') }} numberOfLines={1}>
        {title}
      </AppText>
      <View style={styles.receiptRow}>
        <AppText
          variant="body"
          style={[styles.paid, { color: color('--color-on-paper') }]}
          numberOfLines={1}
        >
          {paid}
        </AppText>
        <AppText variant="reward" style={{ color: color('--color-paper-green') }}>
          {amount}
        </AppText>
      </View>
    </Animated.View>
  );
}

export function FlyingSticker({
  clock,
  x,
  y,
  dx,
  dy,
  land,
  art,
}: {
  clock: Clock;
  x: number;
  y: number;
  dx: number;
  dy: number;
  land: number;
  art: StickerArt;
}) {
  const { color } = useTheme();
  const flyX = useAnimatedStyle(() => ({
    transform: [{ translateX: tween(clock.value, TIMELINE.flyX, 0, dx) }],
  }));
  const flyY = useAnimatedStyle(() => ({
    transform: [{ translateY: tween(clock.value, TIMELINE.flyY, 0, dy) }],
  }));
  const squash = useAnimatedStyle(() => {
    const { start, duration } = TIMELINE.flyScale;
    const t = clock.value;
    return {
      transform: [
        {
          rotate: `${keyframes(t, start, duration, SQUASH, [0, -7, -5, -5, -5, -5], SQUASH_CURVES)}deg`,
        },
        {
          scaleX: keyframes(
            t,
            start,
            duration,
            SQUASH,
            [1, S, S + 0.05, S - 0.02, S, S],
            SQUASH_CURVES,
          ),
        },
        {
          scaleY: keyframes(
            t,
            start,
            duration,
            SQUASH,
            [1, S, S - 0.05, S + 0.03, S, S],
            SQUASH_CURVES,
          ),
        },
      ],
    };
  });
  const fit = useAnimatedStyle(() => ({
    transform: [{ scale: tween(clock.value, TIMELINE.flyX, 1, land) }],
  }));
  const lift = useAnimatedStyle(() => {
    const p = tween(clock.value, TIMELINE.lift, 0, 1);
    return {
      transform: [{ translateY: -16 * p }, { scale: 1 + 0.12 * p }, { rotate: `${-4 + 3 * p}deg` }],
    };
  });
  const curl = useAnimatedStyle(() => {
    const { start, duration, curve } = TIMELINE.curl;
    const t = clock.value;
    return {
      opacity: keyframes(t, start, duration, [0, 0.7, 1], [1, 1, 0], curve),
      transform: [{ scale: keyframes(t, start, duration, [0, 0.7, 1], [0, 1, 1.2], curve) }],
    };
  });
  const clear = color('--color-shine-clear');
  return (
    <View style={[styles.anchor, { left: x, top: y }]} pointerEvents="none">
      <Animated.View style={flyX}>
        <Animated.View style={flyY}>
          <Animated.View style={fit}>
            <Animated.View style={[styles.art, squash]}>
              <Animated.View style={lift}>
                <View style={styles.clip}>
                  <EarnedSticker art={art} width={ART_WIDTH} />
                  <Shine clock={clock} segment={TIMELINE.stickerShine} travel={220} />
                </View>
                <Animated.View
                  style={[
                    styles.curl,
                    {
                      experimental_backgroundImage: `linear-gradient(315deg, ${clear} 49%, ${color('--color-receipt')} 50%, ${color('--color-paper-line')} 85%)`,
                      shadowColor: color('--color-sticker-shadow'),
                    },
                    curl,
                  ]}
                />
              </Animated.View>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  receipt: {
    position: 'absolute',
    left: vars['--space-7'],
    right: vars['--space-7'],
    height: RECEIPT_HEIGHT,
    borderRadius: vars['--radius-sheet'],
    borderCurve: 'continuous',
    paddingHorizontal: vars['--space-5'],
    paddingVertical: vars['--space-4'],
    justifyContent: 'flex-end',
    gap: vars['--space-1'],
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: vars['--space-2'],
  },
  paid: { flexShrink: 1, fontWeight: '800' },
  anchor: { position: 'absolute', width: 0, height: 0 },
  art: {
    position: 'absolute',
    left: -ART_WIDTH / 2,
    top: -ART_HEIGHT / 2,
    width: ART_WIDTH,
    height: ART_HEIGHT,
  },
  clip: { overflow: 'hidden', padding: vars['--space-2'], margin: -vars['--space-2'] },
  curl: {
    position: 'absolute',
    right: vars['--space-2'],
    bottom: vars['--space-2'],
    width: CURL,
    height: CURL,
    borderBottomRightRadius: CURL * 0.7,
    transformOrigin: 'bottom right',
    shadowOffset: { width: -3, height: -3 },
    shadowOpacity: 1,
    shadowRadius: 3,
  },
});

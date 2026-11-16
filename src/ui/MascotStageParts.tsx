import { Image } from 'expo-image';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { AppText } from './AppText';
import { Mascot, MascotWearLayer } from './Mascot';
import type { StageActor, StageSayCoin } from './MascotStage';
import { TapirCoin } from './TapirCoin';
import { vars } from './theme/tokens';
import { useTheme } from './theme/useTheme';

type AnimatedStyle = ComponentProps<typeof Animated.View>['style'];

const BUBBLE_SLOP = { top: 6, bottom: 6 };
const BUBBLE_COIN = 18;
const LEAF_IMAGE = require('@/assets/pantry/leaf.png');

export function StageBody({
  size,
  asleep,
  actor,
}: {
  size: number;
  asleep: boolean;
  actor: StageActor | undefined;
}) {
  const eyes = asleep ? 'asleep' : 'open';
  return (
    <View>
      <Animated.View style={[styles.feet, actor?.bodyStyle]}>
        <Animated.View style={[styles.feet, actor?.chewStyle]}>
          <Mascot variant="side" size={size} outlined eyes={eyes} />
          {actor?.wear ? (
            <Animated.View style={[styles.layer, actor.wearStyle]}>
              <MascotWearLayer wear={actor.wear} size={size} outlined />
            </Animated.View>
          ) : null}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

export function StageLeaf({ size }: { size: number }) {
  return (
    <Image
      source={LEAF_IMAGE}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessible={false}
      testID="stage-leaf"
    />
  );
}

const STAR = 'M10 1 L12 8 L19 10 L12 12 L10 19 L8 12 L1 10 L8 8 Z';

export function Star({ fill, rim }: { fill: string; rim: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 20 20">
      <Path d={STAR} fill={rim} stroke={rim} strokeWidth={2.4} strokeLinejoin="round" />
      <Path d={STAR} fill={fill} />
    </Svg>
  );
}

export function Snore({ color }: { color: string }) {
  return (
    <Svg style={styles.snore} width={30} height={34} viewBox="0 0 30 34">
      <Path
        d="M2 22 H10 L2 31 H10"
        fill="none"
        stroke={color}
        strokeWidth={2.6}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.7}
      />
      <Path
        d="M14 3 H27 L14 16 H27"
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.55}
      />
    </Svg>
  );
}

export function SpeechBubble({
  line,
  coin = null,
  style,
  reveal,
  rise,
  speaking,
  onPress,
}: {
  line: string;
  coin?: StageSayCoin | null;
  style: AnimatedStyle;
  reveal: SharedValue<number>;
  rise: number;
  speaking: boolean;
  onPress?: () => void;
}) {
  const { color } = useTheme();
  const slotStyle = useAnimatedStyle(() => {
    const value = speaking ? reveal.value : 1;
    return { opacity: value, transform: [{ translateY: rise * (1 - value) }] };
  });
  const fill = color('--color-stage-bubble');
  return (
    <Animated.View
      style={[styles.bubbleSlot, slotStyle]}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <Pressable accessible={false} disabled={!onPress} hitSlop={BUBBLE_SLOP} onPress={onPress}>
        <Animated.View
          style={[
            styles.bubble,
            { backgroundColor: fill, shadowColor: color('--color-sticker-shadow') },
            style,
          ]}
        >
          {coin ? (
            <View style={styles.coinLine} testID="stage-say-coin">
              <AppText
                variant="secondary"
                style={[styles.say, { color: color('--color-on-stage') }]}
              >
                {coin.lead}
              </AppText>
              <TapirCoin size={BUBBLE_COIN} />
              <AppText
                variant="secondary"
                style={[styles.say, { color: color('--color-on-stage') }]}
              >
                {coin.tail}
              </AppText>
            </View>
          ) : (
            <AppText
              variant="secondary"
              numberOfLines={3}
              style={[styles.say, { color: color('--color-on-stage') }]}
            >
              {line}
            </AppText>
          )}
          <Svg style={styles.tail} width={9} height={18} viewBox="0 0 9 18">
            <Path d="M0 0 L9 9 L0 18 Z" fill={fill} />
          </Svg>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, top: 0 },
  feet: { transformOrigin: '50% 90%' },
  snore: { position: 'absolute', left: 80, top: -14 },
  bubbleSlot: { position: 'absolute', left: vars['--space-4'], top: 18 },
  bubble: {
    maxWidth: 230,
    borderRadius: vars['--space-5'],
    borderCurve: 'continuous',
    paddingVertical: 9,
    paddingHorizontal: 13,
    shadowOffset: { width: 0, height: vars['--space-2'] },
    shadowOpacity: 1,
    shadowRadius: vars['--space-3'],
  },
  say: { fontWeight: '700' },
  coinLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: vars['--space-1'],
  },
  tail: { position: 'absolute', right: -8, bottom: 14 },
});

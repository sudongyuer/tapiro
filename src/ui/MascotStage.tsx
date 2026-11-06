import type { ComponentProps, ReactNode } from 'react';
import {
  type AccessibilityActionEvent,
  PlatformColor,
  Pressable,
  StyleSheet,
  View,
  type ViewProps,
} from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import Svg, { Line, Path } from 'react-native-svg';

import type { MascotWear } from './MascotWear';
import { Snore, SpeechBubble, StageBody, StageLeaf, Star } from './MascotStageParts';
import { CarArt, ParcelArt, StickerShadow } from './StickerArt';
import { vars, type TokenName } from './theme/tokens';
import { useTheme } from './theme/useTheme';

export type StageState = 'urgent' | 'live' | 'calm';

export const STAGE_HEIGHT = 200;
export const STAGE_HILL_HEIGHT = 110;
const BLEED = 1000;
const SUN_SIZE = 70;
const LEAF_HINT = 20;

const POSE: Record<StageState, { size: number; right: number; top: number; sunTop: number }> = {
  urgent: { size: 96, right: 58, top: -8, sunTop: -60 },
  live: { size: 86, right: 54, top: 2, sunTop: -54 },
  calm: { size: 96, right: 58, top: -8, sunTop: 10 },
};

export function stageColor(state: StageState): TokenName {
  return `--color-stage-${state}`;
}

type AnimatedStyle = ComponentProps<typeof Animated.View>['style'];

export type StageActor = {
  wear: MascotWear | null;
  say: string | null;
  sayOverLive?: boolean;
  hint: 'star' | 'leaf' | null;
  onPress: (() => void) | null;
  action: string | null;
  bodyStyle?: AnimatedStyle;
  wearStyle?: AnimatedStyle;
  chewStyle?: AnimatedStyle;
  overlay?: ReactNode;
  reveal?: SharedValue<number>;
  revealRise?: number;
};

export const stageSay = (actor: StageActor | undefined, state: StageState) =>
  state === 'calm' || actor?.sayOverLive ? (actor?.say ?? null) : null;

export type MascotStageProps = ViewProps & {
  state: StageState;
  line: string;
  bubbleStyle?: AnimatedStyle;
  actor?: StageActor;
};

const MASCOT_ACTION = 'mascot';

export function MascotStage({ state, line, bubbleStyle, actor, style, ...rest }: MascotStageProps) {
  const { color } = useTheme();
  const pose = POSE[state];
  const ink = color('--color-on-stage');
  const say = stageSay(actor, state);
  const sleeping = state === 'calm' && say === null;
  const shown = useSharedValue(1);
  const reveal = actor?.reveal ?? shown;
  const rise = actor?.revealRise ?? 0;
  const speaking = say !== null;
  const slotStyle = useAnimatedStyle(() => {
    const value = speaking ? reveal.value : 1;
    return { opacity: value, transform: [{ translateY: rise * (1 - value) }] };
  });
  const starStyle = useAnimatedStyle(() => ({ opacity: reveal.value }));
  const onAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === MASCOT_ACTION) actor?.onPress?.();
  };
  return (
    <View
      {...rest}
      style={[styles.stage, { backgroundColor: color(stageColor(state)) }, style]}
      accessible
      accessibilityLabel={say ?? line}
      accessibilityRole={actor?.action ? 'button' : undefined}
      accessibilityHint={actor?.action ?? undefined}
      accessibilityActions={
        actor?.action ? [{ name: MASCOT_ACTION, label: actor.action }] : undefined
      }
      onAccessibilityAction={actor?.action ? onAction : undefined}
      onAccessibilityTap={actor?.action ? (actor.onPress ?? undefined) : undefined}
    >
      <View style={[styles.bleed, { backgroundColor: color(stageColor(state)) }]} />
      <View
        style={[
          styles.sun,
          {
            top: pose.sunTop,
            backgroundColor: color(`--color-stage-sun-${state}` as TokenName),
          },
        ]}
      />
      <View style={styles.hill}>
        <Svg
          width="100%"
          height={STAGE_HILL_HEIGHT}
          viewBox="0 0 100 110"
          preserveAspectRatio="none"
        >
          <Path
            d="M0 40 A50 40 0 0 1 100 40 V110 H0 Z"
            fill={PlatformColor('systemGroupedBackground')}
          />
        </Svg>
      </View>
      {state === 'live' ? (
        <Svg style={styles.road} width="100%" height={10}>
          <Line
            x1={0}
            y1={5}
            x2="100%"
            y2={5}
            stroke={ink}
            strokeWidth={10}
            strokeDasharray="18 16"
            opacity={0.25}
          />
        </Svg>
      ) : null}
      <View style={[styles.actor, { right: pose.right, top: pose.top }]}>
        {state === 'live' ? (
          <StickerShadow style={styles.car}>
            <CarArt
              width={84}
              body={color('--color-ride')}
              window={color('--color-on-card-ride')}
            />
          </StickerShadow>
        ) : null}
        <Pressable
          accessible={false}
          disabled={!actor?.onPress}
          onPress={actor?.onPress ?? undefined}
        >
          <StickerShadow>
            <StageBody size={pose.size} asleep={sleeping} actor={actor} />
          </StickerShadow>
        </Pressable>
        {state === 'urgent' ? (
          <StickerShadow style={styles.parcel}>
            <ParcelArt width={46} />
          </StickerShadow>
        ) : null}
        {sleeping ? <Snore color={ink} /> : null}
        {actor?.hint === 'star' && say === null ? (
          <Animated.View style={[styles.star, starStyle]} pointerEvents="none">
            <Star fill={color('--color-stage-hint')} rim={color('--color-sticker-border')} />
          </Animated.View>
        ) : null}
        {actor?.hint === 'leaf' && say === null ? (
          <View style={styles.leafHint} pointerEvents="none">
            <StageLeaf size={LEAF_HINT} />
          </View>
        ) : null}
        {actor?.overlay}
      </View>
      <SpeechBubble
        line={say ?? line}
        style={bubbleStyle}
        slotStyle={slotStyle}
        onPress={say === null ? undefined : (actor?.onPress ?? undefined)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { height: STAGE_HEIGHT, marginHorizontal: -vars['--space-4'] },
  bleed: { position: 'absolute', left: 0, right: 0, top: -BLEED, height: BLEED },
  sun: {
    position: 'absolute',
    right: 56,
    width: SUN_SIZE,
    height: SUN_SIZE,
    borderRadius: SUN_SIZE / 2,
    opacity: 0.9,
  },
  hill: { position: 'absolute', left: -20, right: -20, bottom: 0, height: STAGE_HILL_HEIGHT },
  road: { position: 'absolute', left: 0, right: 0, top: 72 },
  actor: { position: 'absolute' },
  star: { position: 'absolute', left: 20, top: -14 },
  leafHint: { position: 'absolute', right: -14, top: '38%' },
  car: { position: 'absolute', left: -30, bottom: -6 },
  parcel: { position: 'absolute', right: -38, bottom: 0, transform: [{ rotate: '8deg' }] },
});

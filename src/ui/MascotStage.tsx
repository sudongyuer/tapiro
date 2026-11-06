import type { ComponentProps } from 'react';
import {
  type AccessibilityActionEvent,
  PlatformColor,
  Pressable,
  StyleSheet,
  View,
  type ViewProps,
} from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Line, Path } from 'react-native-svg';

import { AppText } from './AppText';
import { Mascot, MascotWearLayer } from './Mascot';
import type { MascotWear } from './MascotWear';
import { CarArt, ParcelArt, StickerShadow } from './StickerArt';
import { vars, type TokenName } from './theme/tokens';
import { useTheme } from './theme/useTheme';

export type StageState = 'urgent' | 'live' | 'calm';

export const STAGE_HEIGHT = 200;
export const STAGE_HILL_HEIGHT = 110;
const BLEED = 1000;
const SUN_SIZE = 70;

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
  hint: 'star' | null;
  onPress: (() => void) | null;
  action: string | null;
  bodyStyle?: AnimatedStyle;
  oldBodyStyle?: AnimatedStyle;
  wearStyle?: AnimatedStyle;
  revealStyle?: AnimatedStyle;
};

export const stageSay = (actor: StageActor | undefined, state: StageState) =>
  state === 'calm' ? (actor?.say ?? null) : null;

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
  const onAction = (event: AccessibilityActionEvent) => {
    const { actionName } = event.nativeEvent;
    if (actionName === MASCOT_ACTION || actionName === 'activate') actor?.onPress?.();
  };
  return (
    <View
      {...rest}
      style={[styles.stage, { backgroundColor: color(stageColor(state)) }, style]}
      accessible
      accessibilityLabel={say ?? line}
      accessibilityActions={
        actor?.action
          ? [
              { name: 'activate', label: actor.action },
              { name: MASCOT_ACTION, label: actor.action },
            ]
          : undefined
      }
      onAccessibilityAction={actor?.action ? onAction : undefined}
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
          <Animated.View style={[styles.star, actor.revealStyle]}>
            <Star fill={color('--color-stage-hint')} rim={color('--color-sticker-border')} />
          </Animated.View>
        ) : null}
      </View>
      <SpeechBubble
        line={say ?? line}
        style={say === null ? bubbleStyle : [bubbleStyle, actor?.revealStyle]}
      />
    </View>
  );
}

function StageBody({
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
      {actor?.oldBodyStyle ? (
        <Animated.View style={[styles.layer, styles.feet, actor.oldBodyStyle]}>
          <Mascot variant="side" size={size} outlined eyes={eyes} />
        </Animated.View>
      ) : null}
      <Animated.View style={[styles.feet, actor?.bodyStyle]}>
        <Mascot variant="side" size={size} outlined eyes={eyes} />
        {actor?.wear ? (
          <Animated.View style={[styles.layer, actor.wearStyle]}>
            <MascotWearLayer wear={actor.wear} size={size} outlined />
          </Animated.View>
        ) : null}
      </Animated.View>
    </View>
  );
}

const STAR = 'M10 1 L12 8 L19 10 L12 12 L10 19 L8 12 L1 10 L8 8 Z';

function Star({ fill, rim }: { fill: string; rim: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 20 20">
      <Path d={STAR} fill={rim} stroke={rim} strokeWidth={2.4} strokeLinejoin="round" />
      <Path d={STAR} fill={fill} />
    </Svg>
  );
}

function Snore({ color }: { color: string }) {
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

function SpeechBubble({ line, style }: { line: string; style: MascotStageProps['bubbleStyle'] }) {
  const { color } = useTheme();
  const fill = color('--color-stage-bubble');
  return (
    <Animated.View
      style={[
        styles.bubble,
        { backgroundColor: fill, shadowColor: color('--color-sticker-shadow') },
        style,
      ]}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <AppText
        variant="secondary"
        numberOfLines={3}
        style={[styles.say, { color: color('--color-on-stage') }]}
      >
        {line}
      </AppText>
      <Svg style={styles.tail} width={9} height={18} viewBox="0 0 9 18">
        <Path d="M0 0 L9 9 L0 18 Z" fill={fill} />
      </Svg>
    </Animated.View>
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
  layer: { position: 'absolute', left: 0, top: 0 },
  feet: { transformOrigin: '50% 100%' },
  star: { position: 'absolute', left: 20, top: -14 },
  car: { position: 'absolute', left: -30, bottom: -6 },
  parcel: { position: 'absolute', right: -38, bottom: 0, transform: [{ rotate: '8deg' }] },
  snore: { position: 'absolute', left: 80, top: -14 },
  bubble: {
    position: 'absolute',
    left: vars['--space-4'],
    top: 18,
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
  tail: { position: 'absolute', right: -8, bottom: 14 },
});

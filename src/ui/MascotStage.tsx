import type { ComponentProps } from 'react';
import { PlatformColor, StyleSheet, View, type ViewProps } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Line, Path } from 'react-native-svg';

import { AppText } from './AppText';
import { Mascot } from './Mascot';
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

export type MascotStageProps = ViewProps & {
  state: StageState;
  line: string;
  bubbleStyle?: ComponentProps<typeof Animated.View>['style'];
};

export function MascotStage({ state, line, bubbleStyle, style, ...rest }: MascotStageProps) {
  const { color } = useTheme();
  const pose = POSE[state];
  const ink = color('--color-on-stage');
  return (
    <View
      {...rest}
      style={[styles.stage, { backgroundColor: color(stageColor(state)) }, style]}
      accessible
      accessibilityLabel={line}
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
        <StickerShadow>
          <Mascot
            variant="side"
            size={pose.size}
            outlined
            eyes={state === 'calm' ? 'asleep' : 'open'}
          />
        </StickerShadow>
        {state === 'urgent' ? (
          <StickerShadow style={styles.parcel}>
            <ParcelArt width={46} />
          </StickerShadow>
        ) : null}
        {state === 'calm' ? <Snore color={ink} /> : null}
      </View>
      <SpeechBubble line={line} style={bubbleStyle} />
    </View>
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

import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type ViewInstance } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import { AppText } from '@/ui/AppText';
import { Mascot } from '@/ui/Mascot';
import { mascotPaint } from '@/ui/mascotPaint';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import type { Face } from '../types';
import { FACE_SIZE } from './ReviewPickers';
import { ReviewFace } from './ReviewFace';
import {
  easeEnter,
  easeMove,
  progress,
  SEAL,
  SEAL_ENVELOPE_RISE,
  SEAL_FACE_SCALE,
} from './sealTimeline';
import type { SealClock } from './useSealClock';

const WIDTH = 140;
const HEIGHT = 96;
const FLAP_HEIGHT = 58;
const SEAL_SIZE = 34;
const SEAL_ART = 22;
const FALLBACK_LIFT = -160;

export type ScreenRect = { x: number; y: number; width: number; height: number };

function Envelope({
  seal,
  face,
  from,
  onPlaced,
}: {
  seal: SealClock;
  face: Face | null;
  from: ScreenRect | null;
  onPlaced: () => void;
}) {
  const { theme, color } = useTheme();
  const paint = mascotPaint(theme);
  const rim = theme === 'dark' ? { stroke: paint.rim, strokeWidth: 1 } : null;
  const { clock, press, reduced } = seal;
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null);
  const slot = useRef<ViewInstance>(null);

  const measure = () =>
    slot.current?.measureInWindow((x, y, width, height) => {
      const centreX = x + width / 2;
      const centreY = y + height / 2;
      setOffset(
        from && from.width > 0
          ? { x: from.x + from.width / 2 - centreX, y: from.y + from.height / 2 - centreY }
          : { x: 0, y: FALLBACK_LIFT },
      );
      onPlaced();
    });

  const envelope = useAnimatedStyle(() => {
    const rise = easeEnter(progress(clock.value, SEAL.envelope));
    return {
      opacity: rise,
      transform: [{ translateY: (1 - rise) * SEAL_ENVELOPE_RISE }],
    };
  });
  const flap = useAnimatedStyle(() => {
    const shut = easeEnter(progress(clock.value, SEAL.flap));
    return { transform: [{ perspective: 400 }, { rotateX: `${180 * (1 - shut)}deg` }] };
  });
  const stamp = useAnimatedStyle(() => ({
    opacity: progress(clock.value, SEAL.pressFade),
    transform: [{ scale: press.value }],
  }));
  const dx = offset?.x ?? 0;
  const dy = offset?.y ?? 0;
  const moving = useAnimatedStyle(() => {
    const move = easeMove(progress(clock.value, SEAL.faceMove));
    return {
      opacity: 1 - progress(clock.value, SEAL.faceFade),
      transform: [
        { translateX: dx * (1 - move) },
        { translateY: dy * (1 - move) },
        { scale: 1 - (1 - SEAL_FACE_SCALE) * move },
      ],
    };
  }, [dx, dy]);

  return (
    <View ref={slot} style={styles.slot} onLayout={measure} testID="review-envelope">
      <Animated.View style={[StyleSheet.absoluteFill, envelope]}>
        <Svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} accessible={false}>
          <Rect x={0} y={0} width={WIDTH} height={HEIGHT} rx={10} fill={paint.ink} {...rim} />
          <Path
            d="M0 34 L70 72 L140 34 L140 86 Q140 96 130 96 L10 96 Q0 96 0 86 Z"
            fill={paint.snout}
          />
        </Svg>
      </Animated.View>
      {face && offset && !reduced ? (
        <Animated.View style={[styles.face, moving]}>
          <ReviewFace face={face} size={FACE_SIZE} />
        </Animated.View>
      ) : null}
      <Animated.View style={[StyleSheet.absoluteFill, envelope]}>
        <Animated.View style={[styles.flap, flap]}>
          <Svg
            width={WIDTH}
            height={FLAP_HEIGHT}
            viewBox={`0 0 ${WIDTH} ${FLAP_HEIGHT}`}
            accessible={false}
          >
            <Path
              d="M4 0 L136 0 L70 58 Z"
              fill={paint.ink}
              stroke={paint.rim}
              strokeOpacity={0.5}
              strokeWidth={2}
              strokeLinejoin="round"
            />
          </Svg>
        </Animated.View>
        <Animated.View
          style={[
            styles.seal,
            {
              backgroundColor: color('--color-mascot-saddle'),
              borderColor: color('--color-sticker-border'),
            },
            stamp,
          ]}
        >
          <Mascot variant="side" size={SEAL_ART} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

export function SealLayer({
  seal,
  face,
  from,
  envelope,
  title,
  note,
  ok,
  onPlaced,
  onOk,
}: {
  seal: SealClock;
  face: Face | null;
  from: ScreenRect | null;
  envelope: boolean;
  title: string;
  note: string;
  ok: string;
  onPlaced: () => void;
  onOk: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { clock, fade, reduced, live, skip } = seal;
  const layer = useAnimatedStyle(() => ({ opacity: reduced ? fade.value : 1 }));
  const copy = useAnimatedStyle(() => ({ opacity: progress(clock.value, SEAL.copy) }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, layer]} testID="review-seal">
      <Pressable
        accessible={false}
        onPress={skip}
        style={[styles.layer, { paddingBottom: insets.bottom + vars['--space-3'] }]}
      >
        <View style={styles.centre}>
          {envelope ? <Envelope seal={seal} face={face} from={from} onPlaced={onPlaced} /> : null}
          <Animated.View style={[styles.copy, copy]}>
            <AppText
              variant="title"
              accessibilityRole="header"
              testID="review-sealed-title"
              style={styles.text}
            >
              {title}
            </AppText>
            <AppText
              variant="secondary"
              tone="secondaryLabel"
              testID="review-sealed-note"
              style={styles.text}
            >
              {note}
            </AppText>
          </Animated.View>
        </View>
        <Animated.View style={copy}>
          <PillButton
            label={ok}
            variant="secondary"
            onPress={live ? onOk : skip}
            testID="review-sealed-ok"
          />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    flex: 1,
    paddingHorizontal: vars['--space-5'],
  },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: vars['--space-5'],
  },
  slot: { width: WIDTH, height: HEIGHT },
  face: {
    position: 'absolute',
    left: (WIDTH - FACE_SIZE) / 2,
    top: HEIGHT / 2 - FACE_SIZE / 2,
  },
  flap: { width: WIDTH, height: FLAP_HEIGHT, transformOrigin: 'top' },
  seal: {
    position: 'absolute',
    left: (WIDTH - SEAL_SIZE) / 2,
    top: 41,
    width: SEAL_SIZE,
    height: SEAL_SIZE,
    borderRadius: SEAL_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { alignItems: 'center', gap: vars['--space-2'] },
  text: { textAlign: 'center' },
});

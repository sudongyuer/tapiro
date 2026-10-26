import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import type { TokenName } from '@/ui/theme/tokens';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { confettiPieces, type ConfettiPiece } from './model';
import { keyframes, TIMELINE } from './timeline';
import type { Clock } from './useCelebrationClock';

const COLOURS: TokenName[] = [
  '--color-sticker-pickup',
  '--color-sticker-buy',
  '--color-sticker-queue',
  '--color-sticker-handle',
  '--color-sticker-move',
  '--color-sticker-accompany',
  '--color-paper-green',
  '--color-mascot-blush',
];
const STAR =
  'M12 1.5 L14.8 8.6 L22.4 9 L16.5 13.8 L18.5 21.2 L12 17 L5.5 21.2 L7.5 13.8 L1.6 9 L9.2 8.6 Z';
const OUT = [0.1, 0.8, 0.3, 1] as const;
const FALL = [0.5, 0, 0.9, 0.6] as const;
const PATH = [0, 0.45, 1];

function Piece({ piece, index, clock }: { piece: ConfettiPiece; index: number; clock: Clock }) {
  const { color } = useTheme();
  const fill = color(COLOURS[piece.colour]);
  const white = color('--color-sticker-border');
  const motion = useAnimatedStyle(() => {
    const { duration, stagger } = TIMELINE.confetti;
    const start = TIMELINE.confetti.start + index * stagger;
    const t = clock.value;
    const along = (values: number[]) => keyframes(t, start, duration, PATH, values, [OUT, FALL]);
    return {
      opacity: keyframes(t, start, duration, [0, 0.06, 0.85, 1], [0, 1, 1, 0]),
      transform: [
        { translateX: along([0, piece.x1, piece.x2]) },
        { translateY: along([0, piece.y1, piece.y2]) },
        { rotate: `${along([0, piece.r1, piece.r2])}deg` },
        { scale: along([0.3, 1, 0.85]) },
      ],
    };
  });
  const size = piece.size;
  return (
    <Animated.View style={[styles.piece, { shadowColor: color('--color-sticker-shadow') }, motion]}>
      {piece.shape === 'star' ? (
        <Svg width={size} height={size} viewBox="0 0 24 24" style={styles.visible}>
          <Path d={STAR} fill={white} stroke={white} strokeWidth={3.4} strokeLinejoin="round" />
          <Path d={STAR} fill={fill} />
        </Svg>
      ) : (
        <View
          style={[
            piece.shape === 'dot'
              ? { width: size - 3, height: size - 3, borderRadius: size }
              : { width: size + 2, height: Math.round(size / 2), borderRadius: 3 },
            {
              backgroundColor: fill,
              borderColor: white,
              borderWidth: vars['--sticker-border-small'],
            },
          ]}
        />
      )}
    </Animated.View>
  );
}

export function Confetti({ clock, count }: { clock: Clock; count: number }) {
  const pieces = confettiPieces(count);
  return (
    <View style={styles.origin} pointerEvents="none">
      {pieces.map((piece, index) => (
        <Piece key={index} piece={piece} index={index} clock={clock} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  origin: { position: 'absolute', width: 0, height: 0 },
  piece: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 1,
  },
  visible: { overflow: 'visible' },
});

import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

import { mascotPaint } from '@/ui/mascotPaint';
import { useTheme } from '@/ui/theme/useTheme';

import type { Face } from '../types';

const ART = {
  happy: {
    earY: 18,
    earLeft: -18,
    earRight: 18,
    eyeLeft: 'M27 42 Q32 36 37 42',
    eyeRight: 'M47 42 Q52 36 57 42',
    blush: 0.9,
  },
  okay: {
    earY: 20,
    earLeft: -6,
    earRight: 6,
    eyeLeft: 'M28 41 L36 41',
    eyeRight: 'M48 41 L56 41',
    blush: 0.3,
  },
  unhappy: {
    earY: 24,
    earLeft: 30,
    earRight: -30,
    eyeLeft: 'M27 38 Q32 44 37 40',
    eyeRight: 'M47 40 Q52 44 57 38',
    blush: 0,
  },
} as const;

const RATIO = 80 / 84;
const DARK_RIM = 2;

export function ReviewFace({ face, size }: { face: Face; size: number }) {
  const { theme } = useTheme();
  const paint = mascotPaint(theme);
  const art = ART[face];
  const rim = theme === 'dark' ? { stroke: paint.rim, strokeWidth: DARK_RIM } : null;
  const leftEar = `rotate(${art.earLeft} 22 26)`;
  const rightEar = `rotate(${art.earRight} 74 26)`;
  return (
    <Svg
      width={size}
      height={size * RATIO}
      viewBox="-4 -6 92 90"
      accessible={false}
      style={{ overflow: 'visible' }}
    >
      <G transform="translate(-3.1 -3) scale(0.94)">
        <Ellipse
          cx={22}
          cy={art.earY}
          rx={10}
          ry={13}
          transform={leftEar}
          fill={paint.ink}
          {...rim}
        />
        <Ellipse
          cx={74}
          cy={art.earY}
          rx={10}
          ry={13}
          transform={rightEar}
          fill={paint.ink}
          {...rim}
        />
        <Ellipse cx={48} cy={50} rx={34} ry={31} fill={paint.ink} {...rim} />
        <Ellipse cx={48} cy={66} rx={13} ry={10} fill={paint.snout} />
        <Circle cx={44} cy={67} r={1.6} fill={paint.rim} opacity={0.75} />
        <Circle cx={52} cy={67} r={1.6} fill={paint.rim} opacity={0.75} />
      </G>
      <Path d={art.eyeLeft} fill="none" stroke={paint.rim} strokeWidth={3} strokeLinecap="round" />
      <Path d={art.eyeRight} fill="none" stroke={paint.rim} strokeWidth={3} strokeLinecap="round" />
      <Circle cx={20} cy={54} r={5} fill={paint.blush} opacity={art.blush} />
      <Circle cx={64} cy={54} r={5} fill={paint.blush} opacity={art.blush} />
    </Svg>
  );
}

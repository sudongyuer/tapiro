import { useId } from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';

import { useTheme } from './theme/useTheme';

const TRUNK = 'M46 82 C36 86 27 93 21 103 C17 111 23 117 31 113 C37 109 45 105 56 102 Z';
const BAND = 'M10 68 C30 58 70 58 90 68 L90 82 C70 72 30 72 10 82 Z';

export function TapirCoin({ size, testID }: { size: number; testID?: string }) {
  const { color } = useTheme();
  const id = useId().replace(/:/g, '');
  const gold = `${id}gold`;
  const ink = `${id}ink`;
  const cream = `${id}cream`;
  const clip = `${id}clip`;
  const wire = color('--color-coin-gold');
  const wireLine = {
    fill: 'none',
    stroke: wire,
    strokeWidth: 5,
    strokeLinejoin: 'round',
    strokeLinecap: 'round',
  } as const;
  return (
    <View
      testID={testID}
      accessible={false}
      style={{
        width: size,
        height: size,
        shadowColor: color('--color-coin-shadow'),
        shadowOpacity: 1,
        shadowOffset: { width: 0, height: Math.max(1, Math.round(size / 26)) },
        shadowRadius: Math.max(1, Math.round(size / 14)) / 2,
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={gold} x1="0.2" y1="0" x2="0.8" y2="1">
            <Stop offset="0" stopColor={color('--color-coin-gold-light')} />
            <Stop offset="0.5" stopColor={wire} />
            <Stop offset="1" stopColor={color('--color-coin-gold-deep')} />
          </LinearGradient>
          <RadialGradient id={ink} cx="0.4" cy="0.32" r="0.8">
            <Stop offset="0" stopColor={color('--color-coin-ink-light')} />
            <Stop offset="0.7" stopColor={color('--color-coin-ink')} />
            <Stop offset="1" stopColor={color('--color-coin-ink-deep')} />
          </RadialGradient>
          <LinearGradient id={cream} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color('--color-coin-cream-light')} />
            <Stop offset="1" stopColor={color('--color-coin-cream')} />
          </LinearGradient>
          <ClipPath id={clip}>
            <Circle cx={50} cy={50} r={40} />
          </ClipPath>
        </Defs>
        <Circle cx={50} cy={50} r={49} fill={`url(#${gold})`} />
        <Circle
          cx={50}
          cy={50}
          r={45.6}
          fill="none"
          stroke={color('--color-coin-dot')}
          strokeOpacity={0.7}
          strokeWidth={1.6}
          strokeDasharray={[0.1, 3.6]}
          strokeLinecap="round"
        />
        <Circle cx={50} cy={50} r={41.6} fill={color('--color-coin-gold-deep')} />
        <Circle cx={50} cy={50} r={40} fill={`url(#${ink})`} />
        <G clipPath={`url(#${clip})`}>
          <Path d={BAND} fill={`url(#${cream})`} opacity={0.95} />
          <Path d="M10 68 C30 58 70 58 90 68" fill="none" stroke={wire} strokeWidth={1} />
          <Path d="M10 82 C30 72 70 72 90 82" fill="none" stroke={wire} strokeWidth={1} />
        </G>
        <G transform="translate(14 -1) scale(0.56)">
          <Ellipse cx={88} cy={50} rx={11} ry={15} rotation={18} origin="88, 50" {...wireLine} />
          <Ellipse cx={72} cy={82} rx={36} ry={33} {...wireLine} />
          <Path d={TRUNK} {...wireLine} />
          <Ellipse
            cx={88}
            cy={50}
            rx={11}
            ry={15}
            rotation={18}
            origin="88, 50"
            fill={`url(#${cream})`}
          />
          <Ellipse
            cx={88}
            cy={51}
            rx={5.5}
            ry={8.5}
            rotation={18}
            origin="88, 51"
            fill="none"
            stroke={color('--color-coin-ink')}
            strokeWidth={2.6}
          />
          <Ellipse cx={72} cy={82} rx={36} ry={33} fill={`url(#${cream})`} />
          <Path d={TRUNK} fill={`url(#${cream})`} />
          <Ellipse cx={60} cy={77} rx={3.6} ry={4.2} fill={color('--color-coin-ink')} />
          <Circle cx={61.6} cy={74.6} r={1.3} fill={color('--color-coin-shine')} />
          <Ellipse
            cx={74}
            cy={96}
            rx={7}
            ry={4.6}
            fill={color('--color-coin-blush')}
            opacity={0.9}
          />
          <Path
            d="M40 104 Q46 108 52 104"
            fill="none"
            stroke={color('--color-coin-ink')}
            strokeWidth={2.2}
            strokeLinecap="round"
            opacity={0.9}
          />
          <Circle cx={24} cy={108} r={1.6} fill={color('--color-coin-ink')} opacity={0.8} />
        </G>
        <Path
          d="M16 38 A36 36 0 0 1 54 13 A41 41 0 0 0 20 46 Z"
          fill={color('--color-coin-shine')}
          opacity={0.18}
        />
        <Circle
          cx={50}
          cy={50}
          r={40}
          fill="none"
          stroke={color('--color-coin-shine')}
          strokeOpacity={0.25}
          strokeWidth={0.8}
        />
      </Svg>
    </View>
  );
}

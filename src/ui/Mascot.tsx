import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

import { mascotPaint } from '@/ui/mascotPaint';
import { useTheme } from '@/ui/theme/useTheme';

export type MascotVariant = 'side' | 'front';

const SIDE_TRUNK = 'M46 82 C36 86 27 93 21 103 C17 111 23 117 31 113 C37 109 45 105 56 102 Z';

export function Mascot({ variant, size }: { variant: MascotVariant; size: number }) {
  const { theme } = useTheme();
  const paint = mascotPaint(theme);
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      accessible={false}
      style={{ overflow: 'visible' }}
    >
      {variant === 'side' ? <Side {...paint} /> : <Front {...paint} />}
    </Svg>
  );
}

type Paint = ReturnType<typeof mascotPaint>;

function Side({ line, ink, rim, blush, eye }: Paint) {
  const outline = {
    fill: 'none',
    stroke: line,
    strokeWidth: 7,
    strokeLinejoin: 'round',
    strokeLinecap: 'round',
  } as const;
  return (
    <G transform="translate(-4 -14) scale(0.6)">
      <Ellipse cx={88} cy={50} rx={11} ry={15} rotation={18} origin="88, 50" {...outline} />
      <Ellipse cx={72} cy={82} rx={36} ry={33} {...outline} />
      <Path d={SIDE_TRUNK} {...outline} />
      <Ellipse cx={88} cy={50} rx={11} ry={15} rotation={18} origin="88, 50" fill={ink} />
      <Ellipse
        cx={88}
        cy={51}
        rx={5.5}
        ry={8.5}
        rotation={18}
        origin="88, 51"
        fill="none"
        stroke={rim}
        strokeWidth={2.6}
      />
      <Ellipse cx={72} cy={82} rx={36} ry={33} fill={ink} />
      <Path d={SIDE_TRUNK} fill={ink} />
      <Ellipse cx={62} cy={76} rx={6} ry={6.6} fill={eye} />
      <Ellipse cx={60} cy={77} rx={3.6} ry={4.2} fill={line} />
      <Circle cx={61.6} cy={74.6} r={1.4} fill={eye} />
      <Ellipse cx={74} cy={96} rx={7} ry={4.6} fill={blush} opacity={0.9} />
      <Path
        d="M40 104 Q46 108 52 104"
        fill="none"
        stroke={rim}
        strokeWidth={2.2}
        strokeLinecap="round"
        opacity={0.9}
      />
      <Circle cx={24} cy={108} r={1.6} fill={rim} opacity={0.8} />
    </G>
  );
}

function Front({ line, ink, rim, blush, snout, eye }: Paint) {
  const outline = {
    fill: 'none',
    stroke: line,
    strokeWidth: 6,
    strokeLinejoin: 'round',
  } as const;
  return (
    <G transform="translate(3.2 6) scale(0.6)">
      <Ellipse cx={22} cy={20} rx={10} ry={13} rotation={-18} origin="22, 20" {...outline} />
      <Ellipse cx={74} cy={20} rx={10} ry={13} rotation={18} origin="74, 20" {...outline} />
      <Ellipse cx={48} cy={50} rx={34} ry={31} {...outline} />
      <Ellipse cx={48} cy={66} rx={13} ry={10} {...outline} />
      <Ellipse cx={22} cy={20} rx={10} ry={13} rotation={-18} origin="22, 20" fill={ink} />
      <Ellipse cx={74} cy={20} rx={10} ry={13} rotation={18} origin="74, 20" fill={ink} />
      <Ellipse cx={48} cy={50} rx={34} ry={31} fill={ink} />
      <Ellipse cx={48} cy={66} rx={13} ry={10} fill={snout} />
      <Ellipse
        cx={22}
        cy={21}
        rx={5}
        ry={7.6}
        rotation={-18}
        origin="22, 21"
        fill="none"
        stroke={rim}
        strokeWidth={2.4}
      />
      <Ellipse
        cx={74}
        cy={21}
        rx={5}
        ry={7.6}
        rotation={18}
        origin="74, 21"
        fill="none"
        stroke={rim}
        strokeWidth={2.4}
      />
      <Ellipse cx={34} cy={46} rx={5.6} ry={6.2} fill={eye} />
      <Ellipse cx={62} cy={46} rx={5.6} ry={6.2} fill={eye} />
      <Ellipse cx={34.4} cy={47} rx={3.4} ry={4} fill={line} />
      <Ellipse cx={61.6} cy={47} rx={3.4} ry={4} fill={line} />
      <Circle cx={35.8} cy={44.8} r={1.3} fill={eye} />
      <Circle cx={63} cy={44.8} r={1.3} fill={eye} />
      <Ellipse cx={22} cy={60} rx={6.4} ry={4.4} fill={blush} opacity={0.9} />
      <Ellipse cx={74} cy={60} rx={6.4} ry={4.4} fill={blush} opacity={0.9} />
      <Circle cx={44} cy={67} r={1.6} fill={rim} opacity={0.75} />
      <Circle cx={52} cy={67} r={1.6} fill={rim} opacity={0.75} />
    </G>
  );
}

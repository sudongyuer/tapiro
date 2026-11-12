import Svg, { Circle, Ellipse, G, Path, Polygon } from 'react-native-svg';

import { mascotPaint } from '@/ui/mascotPaint';
import { MascotWearArt, type MascotWear } from '@/ui/MascotWear';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

export type MascotVariant = 'side' | 'front';
export type MascotEyes = 'open' | 'asleep';

const ART_SCALE = 0.6;
const DARK_OUTLINE = 1;
const SIDE_TRANSFORM = `translate(-4 -14) scale(${ART_SCALE})`;

const SIDE_TRUNK = 'M46 82 C36 86 27 93 21 103 C17 111 23 117 31 113 C37 109 45 105 56 102 Z';

export type MascotProps = {
  variant: MascotVariant;
  size: number;
  outlined?: boolean;
  darkOutline?: boolean;
  eyes?: MascotEyes;
  wear?: MascotWear | null;
  dizzy?: boolean;
};

function useSticker(size: number, outlined: boolean, darkOutline: boolean) {
  const { theme, color } = useTheme();
  const border = size >= 48 ? vars['--sticker-border'] : vars['--sticker-border-small'];
  const extra = (width: number) => (2 * width * 64) / (size * ART_SCALE);
  if (outlined) return { color: color('--color-sticker-border'), extra: extra(border) };
  return darkOutline && theme === 'dark'
    ? { color: mascotPaint(theme).rim, extra: extra(DARK_OUTLINE) }
    : null;
}

export function Mascot({
  variant,
  size,
  outlined = false,
  darkOutline = false,
  eyes = 'open',
  wear = null,
  dizzy = false,
}: MascotProps) {
  const { theme } = useTheme();
  const paint = mascotPaint(theme);
  const sticker = useSticker(size, outlined, darkOutline);
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      accessible={false}
      style={{ overflow: 'visible' }}
    >
      {variant === 'side' ? (
        <Side {...paint} sticker={sticker} eyes={eyes} wear={wear} />
      ) : (
        <Front {...paint} sticker={sticker} dizzy={dizzy} />
      )}
    </Svg>
  );
}

export function MascotWearLayer({
  wear,
  size,
  outlined = false,
}: {
  wear: MascotWear;
  size: number;
  outlined?: boolean;
}) {
  const sticker = useSticker(size, outlined, false);
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      accessible={false}
      style={{ overflow: 'visible' }}
    >
      <G transform={SIDE_TRANSFORM}>
        <MascotWearArt wear={wear} sticker={sticker} />
      </G>
    </Svg>
  );
}

type Paint = ReturnType<typeof mascotPaint> & {
  sticker: { color: string; extra: number } | null;
};

function SideSilhouette(stroke: { stroke: string; strokeWidth: number }) {
  const outline = {
    fill: 'none',
    strokeLinejoin: 'round',
    strokeLinecap: 'round',
    ...stroke,
  } as const;
  return (
    <>
      <Ellipse cx={88} cy={50} rx={11} ry={15} rotation={18} origin="88, 50" {...outline} />
      <Ellipse cx={72} cy={82} rx={36} ry={33} {...outline} />
      <Path d={SIDE_TRUNK} {...outline} />
    </>
  );
}

function Side({
  line,
  ink,
  rim,
  blush,
  eye,
  sticker,
  eyes,
  wear,
}: Paint & { eyes: MascotEyes; wear: MascotWear | null }) {
  return (
    <G transform={SIDE_TRANSFORM}>
      {sticker ? <SideSilhouette stroke={sticker.color} strokeWidth={7 + sticker.extra} /> : null}
      <SideSilhouette stroke={line} strokeWidth={7} />
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
      {eyes === 'open' ? (
        <>
          <Ellipse cx={62} cy={76} rx={6} ry={6.6} fill={eye} />
          <Ellipse cx={60} cy={77} rx={3.6} ry={4.2} fill={line} />
          <Circle cx={61.6} cy={74.6} r={1.4} fill={eye} />
        </>
      ) : (
        <Path
          d="M56 77 Q62 82 68 77"
          fill="none"
          stroke={rim}
          strokeWidth={2.6}
          strokeLinecap="round"
        />
      )}
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
      {wear ? <MascotWearArt wear={wear} sticker={sticker} /> : null}
    </G>
  );
}

const UPRIGHT_EARS = {
  left: { rotation: -18, origin: '22, 20' },
  right: { rotation: 18, origin: '74, 20' },
};
const DIZZY_EARS = {
  left: { rotation: 10, origin: '22, 26' },
  right: { rotation: -20, origin: '74, 26' },
};
const DIZZY_SPIRAL = 'm-1 0 a1 1 0 1 1 2 0 a2.5 2.5 0 1 1 -4 0 a4 4 0 1 1 7 0';
const DIZZY_STARS = [
  '10,10 11.1,12.5 13.8,12.8 11.7,14.6 12.4,17.2 10,15.8 7.6,17.2 8.3,14.6 6.2,12.8 8.9,12.5',
  '74,6 75.1,8.5 77.8,8.8 75.7,10.6 76.4,13.2 74,11.8 71.6,13.2 72.3,10.6 70.2,8.8 72.9,8.5',
];

type Ears = typeof UPRIGHT_EARS;

function FrontSilhouette({ ears, ...stroke }: { stroke: string; strokeWidth: number; ears: Ears }) {
  const outline = { fill: 'none', strokeLinejoin: 'round', ...stroke } as const;
  return (
    <>
      <Ellipse cx={22} cy={20} rx={10} ry={13} {...ears.left} {...outline} />
      <Ellipse cx={74} cy={20} rx={10} ry={13} {...ears.right} {...outline} />
      <Ellipse cx={48} cy={50} rx={34} ry={31} {...outline} />
      <Ellipse cx={48} cy={66} rx={13} ry={10} {...outline} />
    </>
  );
}

function Front({ line, ink, rim, blush, snout, eye, sticker, dizzy }: Paint & { dizzy: boolean }) {
  const { color } = useTheme();
  const ears = dizzy ? DIZZY_EARS : UPRIGHT_EARS;
  return (
    <G transform={`translate(3.2 6) scale(${ART_SCALE})`}>
      {sticker ? (
        <FrontSilhouette stroke={sticker.color} strokeWidth={6 + sticker.extra} ears={ears} />
      ) : null}
      <FrontSilhouette stroke={line} strokeWidth={6} ears={ears} />
      <Ellipse cx={22} cy={20} rx={10} ry={13} {...ears.left} fill={ink} />
      <Ellipse cx={74} cy={20} rx={10} ry={13} {...ears.right} fill={ink} />
      <Ellipse cx={48} cy={50} rx={34} ry={31} fill={ink} />
      <Ellipse cx={48} cy={66} rx={13} ry={10} fill={snout} />
      <Ellipse
        cx={22}
        cy={dizzy ? 20 : 21}
        rx={5}
        ry={7.6}
        {...(dizzy ? ears.left : { rotation: -18, origin: '22, 21' })}
        fill="none"
        stroke={rim}
        strokeWidth={2.4}
      />
      <Ellipse
        cx={74}
        cy={dizzy ? 20 : 21}
        rx={5}
        ry={7.6}
        {...(dizzy ? ears.right : { rotation: 18, origin: '74, 21' })}
        fill="none"
        stroke={rim}
        strokeWidth={2.4}
      />
      {dizzy ? (
        <G transform="scale(1.0638) translate(3.1 3)">
          <Path
            d={`M32 41 ${DIZZY_SPIRAL}`}
            fill="none"
            stroke={rim}
            strokeWidth={2.2}
            strokeLinecap="round"
          />
          <Path
            d={`M52 41 ${DIZZY_SPIRAL}`}
            fill="none"
            stroke={rim}
            strokeWidth={2.2}
            strokeLinecap="round"
          />
          {DIZZY_STARS.map((points) => (
            <Polygon key={points} points={points} fill={color('--color-stage-hint')} />
          ))}
        </G>
      ) : (
        <>
          <Ellipse cx={34} cy={46} rx={5.6} ry={6.2} fill={eye} />
          <Ellipse cx={62} cy={46} rx={5.6} ry={6.2} fill={eye} />
          <Ellipse cx={34.4} cy={47} rx={3.4} ry={4} fill={line} />
          <Ellipse cx={61.6} cy={47} rx={3.4} ry={4} fill={line} />
          <Circle cx={35.8} cy={44.8} r={1.3} fill={eye} />
          <Circle cx={63} cy={44.8} r={1.3} fill={eye} />
          <Ellipse cx={22} cy={60} rx={6.4} ry={4.4} fill={blush} opacity={0.9} />
          <Ellipse cx={74} cy={60} rx={6.4} ry={4.4} fill={blush} opacity={0.9} />
        </>
      )}
      <Circle cx={44} cy={67} r={1.6} fill={rim} opacity={0.75} />
      <Circle cx={52} cy={67} r={1.6} fill={rim} opacity={0.75} />
    </G>
  );
}

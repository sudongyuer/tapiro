import Svg, { Circle, Path, Rect, Text } from 'react-native-svg';

import type { ObjectKind } from './objectKinds';
import { StickerShadow } from './StickerArt';
import { vars, type TokenName } from './theme/tokens';
import { useTheme } from './theme/useTheme';

type Shape =
  | { rect: [number, number, number, number, number]; fill: TokenName; turn?: string; ink?: true }
  | { path: string; fill: TokenName }
  | { line: string; stroke: TokenName; width: number }
  | { circle: [number, number, number]; fill: TokenName };

const WHITE: TokenName = '--color-sticker-border';
const INK: TokenName = '--color-on-sticker';

const CAR_BODY = 'M12 52 L20 32 Q22 26 30 26 H66 Q74 26 76 32 L84 52 V64 H12 Z';

const ART: Record<ObjectKind, Shape[]> = {
  parcel: [
    { rect: [10, 20, 76, 52, 4], fill: '--color-object-cardboard' },
    { path: 'M10 20 L24 6 L72 6 L86 20 Z', fill: '--color-object-cardboard-lid' },
    { rect: [42, 6, 12, 66, 0], fill: '--color-object-tape' },
    { rect: [58, 44, 20, 12, 2], fill: WHITE, turn: 'rotate(-8 68 50)' },
  ],
  coffee: [
    { path: 'M24 22 H68 L62 74 H30 Z', fill: '--color-object-coffee' },
    { rect: [20, 14, 52, 10, 4], fill: '--color-object-roast' },
    { line: 'M68 34 C82 34 82 54 66 54', stroke: '--color-object-coffee', width: 6 },
    { line: 'M34 40 H58', stroke: '--color-object-tape', width: 4 },
  ],
  ticket: [
    { rect: [20, 6, 56, 68, 6], fill: WHITE, ink: true },
    { line: 'M28 56 H68', stroke: '--color-object-grey', width: 3 },
  ],
  books: [
    { rect: [12, 46, 72, 14, 3], fill: '--color-object-blue' },
    { rect: [18, 30, 62, 14, 3], fill: '--color-object-green' },
    { rect: [14, 14, 66, 14, 3], fill: '--color-object-red' },
    { rect: [12, 62, 72, 12, 3], fill: '--color-object-orange' },
  ],
  umbrella: [
    { path: 'M10 44 C10 20 86 20 86 44 Z', fill: '--color-object-violet' },
    { line: 'M48 44 V68 C48 76 38 76 38 68', stroke: INK, width: 5 },
  ],
  car: [
    { path: CAR_BODY, fill: '--color-object-coral' },
    { path: 'M28 30 H68 L74 46 H22 Z', fill: '--color-object-glass' },
    { rect: [46, 30, 4, 16, 0], fill: '--color-object-coral' },
    { circle: [28, 64, 8], fill: INK },
    { circle: [68, 64, 8], fill: INK },
    { circle: [28, 64, 3], fill: '--color-object-grey' },
    { circle: [68, 64, 3], fill: '--color-object-grey' },
  ],
  boba: [
    { path: 'M26 18 H70 L64 76 H32 Z', fill: '--color-object-milk-tea' },
    { rect: [22, 12, 52, 8, 3], fill: '--color-object-cream' },
    { line: 'M54 2 L50 20', stroke: '--color-object-coral', width: 5 },
    ...[
      [38, 66],
      [48, 68],
      [58, 66],
      [43, 59],
      [53, 59],
    ].map(([cx, cy]) => ({ circle: [cx, cy, 4], fill: '--color-object-roast' }) as Shape),
  ],
};

type Paint = (name: TokenName) => string;

function ShapeView({ shape, paint, outline }: { shape: Shape; paint: Paint; outline: number }) {
  const solid = outline
    ? {
        fill: paint(WHITE),
        stroke: paint(WHITE),
        strokeWidth: outline,
        strokeLinejoin: 'round' as const,
      }
    : null;
  if ('line' in shape) {
    return (
      <Path
        d={shape.line}
        fill="none"
        stroke={paint(outline ? WHITE : shape.stroke)}
        strokeWidth={shape.width + outline}
        strokeLinecap="round"
      />
    );
  }
  if ('circle' in shape) {
    const [cx, cy, r] = shape.circle;
    return <Circle cx={cx} cy={cy} r={r} {...(solid ?? { fill: paint(shape.fill) })} />;
  }
  if ('path' in shape) return <Path d={shape.path} {...(solid ?? { fill: paint(shape.fill) })} />;
  const [x, y, width, height, rx] = shape.rect;
  const own = shape.ink ? { stroke: paint(INK), strokeWidth: 3 } : {};
  return (
    <Rect
      x={x}
      y={y}
      width={width}
      height={height}
      rx={rx}
      transform={shape.turn}
      {...(solid ?? { fill: paint(shape.fill), ...own })}
    />
  );
}

export function ObjectSticker({ kind, width }: { kind: ObjectKind; width: number }) {
  const { color } = useTheme();
  const border = width >= 48 ? vars['--sticker-border'] : vars['--sticker-border-small'];
  const outline = (2 * border * 96) / width;
  const shapes = ART[kind];
  return (
    <StickerShadow>
      <Svg
        width={width}
        height={(width * 80) / 96}
        viewBox="0 0 96 80"
        accessible={false}
        style={{ overflow: 'visible' }}
      >
        {shapes.map((shape, index) => (
          <ShapeView key={`o${index}`} shape={shape} paint={color} outline={outline} />
        ))}
        {shapes.map((shape, index) => (
          <ShapeView key={`f${index}`} shape={shape} paint={color} outline={0} />
        ))}
        {kind === 'ticket' ? (
          <Text
            x={48}
            y={44}
            textAnchor="middle"
            fontSize={vars['--text-reward']}
            fontWeight="900"
            fontFamily={vars['--font-rounded']}
            fill={color('--color-object-red')}
          >
            A23
          </Text>
        ) : null}
      </Svg>
    </StickerShadow>
  );
}

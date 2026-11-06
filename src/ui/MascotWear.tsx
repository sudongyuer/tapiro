import { G, Path } from 'react-native-svg';

import type { TokenName } from './theme/tokens';
import { useTheme } from './theme/useTheme';

export type MascotWear = 'red_hat' | 'backpack' | 'umbrella' | 'scarf';

type Piece = { d: string; paint: TokenName };

const PIECES: Record<MascotWear, readonly Piece[]> = {
  red_hat: [
    {
      d: 'M44 56 C46 36 62 27 74 33 C81 37 83 45 83 51 C70 44 56 47 44 56 Z',
      paint: '--color-wear-red',
    },
    { d: 'M37 61 Q59 41 85 50 Q60 51 37 61 Z', paint: '--color-wear-red-deep' },
    { d: 'M61 29 a5.5 5.5 0 1 0 11 0 a5.5 5.5 0 1 0 -11 0 Z', paint: '--color-wear-red-deep' },
  ],
  backpack: [
    {
      d: 'M99 62 Q116 56 120 71 L123 101 Q124 111 113 112 L104 113 Q110 88 99 62 Z',
      paint: '--color-wear-bag',
    },
    { d: 'M90 62 Q106 72 94 112 L88 111 Q98 76 86 66 Z', paint: '--color-wear-bag-deep' },
  ],
  umbrella: [
    {
      d: 'M96.5 36 h3.6 v42 a6 6 0 0 1 -12 0 h3.4 a2.6 2.6 0 0 0 5 0 Z',
      paint: '--color-wear-handle',
    },
    {
      d: 'M68 38 A30 30 0 0 1 128 38 Q120 31 113 38 Q105 31 98 38 Q90 31 83 38 Q75 31 68 38 Z',
      paint: '--color-wear-canopy',
    },
  ],
  scarf: [
    { d: 'M78 110 L92 106 L98 128 L85 132 Z', paint: '--color-wear-red-deep' },
    { d: 'M52 100 Q74 114 100 98 L104 108 Q74 126 48 110 Z', paint: '--color-wear-red' },
  ],
};

export function MascotWearArt({
  wear,
  sticker,
}: {
  wear: MascotWear;
  sticker: { color: string; extra: number } | null;
}) {
  const { color } = useTheme();
  const pieces = PIECES[wear];
  return (
    <G>
      {sticker
        ? pieces.map((piece) => (
            <Path
              key={`rim-${piece.d}`}
              d={piece.d}
              fill="none"
              stroke={sticker.color}
              strokeWidth={sticker.extra}
              strokeLinejoin="round"
            />
          ))
        : null}
      {pieces.map((piece) => (
        <Path key={piece.d} d={piece.d} fill={color(piece.paint)} />
      ))}
    </G>
  );
}

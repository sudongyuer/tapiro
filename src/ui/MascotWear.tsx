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
      d: 'M92 66 Q108 58 112 72 L113 100 Q113 110 103 111 L95 113 Q104 90 92 66 Z',
      paint: '--color-wear-bag',
    },
    { d: 'M84 62 Q100 74 90 113 L84 112 Q93 78 80 66 Z', paint: '--color-wear-bag-deep' },
  ],
  umbrella: [
    {
      d: 'M90.4 44 h3.2 v34 a5.5 5.5 0 0 1 -11 0 h3 a2.5 2.5 0 0 0 4.8 0 Z',
      paint: '--color-wear-handle',
    },
    {
      d: 'M71 45 A21 21 0 0 1 113 45 Q107.75 39 102.5 45 Q97.25 39 92 45 Q86.75 39 81.5 45 Q76.25 39 71 45 Z',
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

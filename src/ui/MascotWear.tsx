import { G, Image, Path } from 'react-native-svg';

export type MascotWear = 'red_hat' | 'backpack' | 'umbrella' | 'scarf';

const WEAR_IMAGES: Record<MascotWear, number> = {
  red_hat: require('@/assets/wear/red_hat.png'),
  backpack: require('@/assets/wear/backpack.png'),
  umbrella: require('@/assets/wear/umbrella.png'),
  scarf: require('@/assets/wear/scarf.png'),
};

const ART_BOX = { x: 6.667, y: 23.333, size: 106.667 };

// The crayon outline and its wobble reach past the fill paths that trace the rim.
const OUTLINE_PAD = 5.6;

const SILHOUETTES: Record<MascotWear, { shift: string; paths: readonly string[] }> = {
  red_hat: {
    shift: '',
    paths: [
      'M47 57 C51 46 55 37 61 31 C68 37 76 42 85 47 C72 47 59 51 47 57 Z',
      'M44 59 C57 50 72 46 88 46 L88.5 51.5 C73 51.5 59 55 46 64 Z',
      'M56 30.5 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 Z',
    ],
  },
  backpack: {
    shift: 'translate(-2.5 0)',
    paths: [
      'M91 64 C101 58 112 62 112 74 L112 103 C112 109 107 112 101 112 L93 112 C99 96 99 78 91 64 Z',
      'M84 62 C99 74 96 96 90 113 L84 112 C90 94 92 78 80 66 Z',
    ],
  },
  umbrella: {
    shift: 'translate(2 0)',
    paths: [
      'M26 44 L29 44 L29 103 C29 110 19 110 19 104 L22 104 C22 106.5 26 106.5 26 103 Z',
      'M7 46 C8 34 17 27 27.5 27 C38 27 47 34 48 46 Z',
    ],
  },
  scarf: {
    shift: '',
    paths: [
      'M52 101 C69 112 88 110 104 97 L108 107 C90 121 68 122 49 111 Z',
      'M84 112 L96 109 L99 124 L87 126 Z',
    ],
  },
};

export function MascotWearArt({
  wear,
  sticker,
}: {
  wear: MascotWear;
  sticker: { color: string; extra: number } | null;
}) {
  const rim = SILHOUETTES[wear];
  return (
    <G>
      {sticker ? (
        <G transform={rim.shift || undefined}>
          {rim.paths.map((d) => (
            <Path
              key={d}
              d={d}
              fill={sticker.color}
              stroke={sticker.color}
              strokeWidth={sticker.extra + OUTLINE_PAD}
              strokeLinejoin="round"
            />
          ))}
        </G>
      ) : null}
      <Image
        href={WEAR_IMAGES[wear]}
        x={ART_BOX.x}
        y={ART_BOX.y}
        width={ART_BOX.size}
        height={ART_BOX.size}
      />
    </G>
  );
}

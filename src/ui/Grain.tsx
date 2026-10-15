import { useId } from 'react';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';

const GRAIN_SPACING = 14;

export function Grain({ color }: { color: string }) {
  const patternId = `grain${useId().replace(/:/g, '')}`;
  return (
    <Svg width="100%" height="100%" accessible={false}>
      <Defs>
        <Pattern
          id={patternId}
          width={GRAIN_SPACING}
          height={GRAIN_SPACING}
          patternUnits="userSpaceOnUse"
        >
          <Circle cx={GRAIN_SPACING / 2} cy={GRAIN_SPACING / 2} r={1} fill={color} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </Svg>
  );
}

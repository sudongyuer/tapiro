import { Circle, Ellipse, ZStack } from '@expo/ui/swift-ui';
import {
  accessibilityHidden,
  foregroundStyle,
  frame,
  offset,
  strokeBorder,
} from '@expo/ui/swift-ui/modifiers';

import { useTheme } from '@/ui/theme/useTheme';

export function CoinMark() {
  const { color } = useTheme();
  const saddle = color('--color-mascot-saddle');
  return (
    <ZStack modifiers={[frame({ width: 24, height: 24 }), accessibilityHidden()]}>
      <Circle
        modifiers={[foregroundStyle(color('--color-mascot-ink')), frame({ width: 24, height: 24 })]}
      />
      <Circle
        modifiers={[
          strokeBorder({ content: saddle, style: { lineWidth: 1.4 } }),
          frame({ width: 17, height: 17 }),
        ]}
      />
      <Ellipse
        modifiers={[foregroundStyle(saddle), frame({ width: 9, height: 7 }), offset({ y: 1 })]}
      />
    </ZStack>
  );
}

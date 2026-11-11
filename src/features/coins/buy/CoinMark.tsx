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
  const { color, theme } = useTheme();
  const saddle = color('--color-mascot-saddle');
  const ink = color('--color-mascot-ink');
  return (
    <ZStack modifiers={[frame({ width: 24, height: 24 }), accessibilityHidden()]}>
      <Circle
        modifiers={[
          foregroundStyle(ink),
          ...(theme === 'dark'
            ? [strokeBorder({ content: saddle, style: { lineWidth: 1 }, shape: 'circle' })]
            : []),
          frame({ width: 24, height: 24 }),
        ]}
      />
      <Circle
        modifiers={[
          foregroundStyle(ink),
          strokeBorder({ content: saddle, style: { lineWidth: 1.4 }, shape: 'circle' }),
          frame({ width: 17, height: 17 }),
        ]}
      />
      <Ellipse
        modifiers={[foregroundStyle(saddle), frame({ width: 9, height: 7 }), offset({ y: 1 })]}
      />
    </ZStack>
  );
}

import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { Grain } from './Grain';
import { luminance, token, vars, type TokenName } from './theme/tokens';
import { useTheme } from './theme/useTheme';

export type LiveCardTone = 'pay' | 'ride' | 'progress' | 'calm';

export function useLiveCardPaint(tone: LiveCardTone) {
  const { color } = useTheme();
  const surface = color(`--color-card-${tone}` as TokenName);
  const ink = color(`--color-on-card-${tone}` as TokenName);
  const darkSurface = luminance(surface) < 0.2;
  return {
    surface,
    ink,
    darkSurface,
    grain: token('--color-moment-grain', darkSurface ? 'dark' : 'light') as string,
    urgentDot: token('--color-urgent', darkSurface ? 'dark' : 'light') as string,
  };
}

export type LiveCardProps = ViewProps & {
  tone: LiveCardTone;
  hanging?: ReactNode;
  children: ReactNode;
};

export function LiveCard({ tone, hanging, children, style, ...rest }: LiveCardProps) {
  const { color } = useTheme();
  const paint = useLiveCardPaint(tone);
  return (
    <View
      {...rest}
      style={[
        styles.card,
        { backgroundColor: paint.surface, shadowColor: color('--color-sticker-shadow') },
        style,
      ]}
    >
      <View style={styles.grain} pointerEvents="none">
        <Grain color={paint.grain} />
      </View>
      {children}
      {hanging ? (
        <View style={styles.hanging} pointerEvents="none">
          {hanging}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: vars['--radius-sheet'],
    borderCurve: 'continuous',
    paddingTop: vars['--space-5'],
    paddingHorizontal: vars['--space-5'],
    paddingBottom: vars['--space-4'],
    shadowOffset: { width: 0, height: vars['--space-3'] },
    shadowOpacity: 1,
    shadowRadius: vars['--space-3'],
  },
  grain: {
    ...StyleSheet.absoluteFill,
    borderRadius: vars['--radius-sheet'],
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  hanging: {
    position: 'absolute',
    top: -vars['--space-6'],
    right: vars['--space-4'],
    transform: [{ rotate: `${vars['--sticker-rotation-max']}deg` }],
  },
});

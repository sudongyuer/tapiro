import { StyleSheet } from 'react-native';
import Animated, { type useAnimatedStyle } from 'react-native-reanimated';

import { AppText } from '@/ui/AppText';
import { useLiveCardPaint, type LiveCardTone } from '@/ui/LiveCard';
import { MUTED_TEXT_OPACITY, vars } from '@/ui/theme/tokens';

import { PEEK } from './stackLayout';

export function BackFace({
  tone,
  label,
  style,
}: {
  tone: LiveCardTone;
  label: string;
  style: ReturnType<typeof useAnimatedStyle>;
}) {
  const { surface, ink } = useLiveCardPaint(tone);
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.face, { backgroundColor: surface }, style]}
    >
      <AppText variant="meta" numberOfLines={1} style={[styles.faceLabel, { color: ink }]}>
        {label}
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  face: {
    ...StyleSheet.absoluteFill,
    borderRadius: vars['--radius-sheet'],
    borderCurve: 'continuous',
    justifyContent: 'flex-end',
  },
  faceLabel: {
    height: PEEK,
    lineHeight: PEEK,
    textAlign: 'center',
    fontWeight: '700',
    opacity: MUTED_TEXT_OPACITY,
    paddingHorizontal: vars['--space-5'],
  },
});

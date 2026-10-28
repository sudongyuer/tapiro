import { StyleSheet, View } from 'react-native';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';
import type { ViewStyle } from 'react-native';

import { AppText } from '@/ui/AppText';
import { Mascot } from '@/ui/Mascot';
import { stageColor, type StageState } from '@/ui/MascotStage';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

export const STRIP_ROW = 44;
export const STRIP_SHADOW = vars['--space-1'] + vars['--space-3'];

export function HomeStrip({
  state,
  line,
  label,
  top,
  shown,
  style,
}: {
  state: StageState;
  line: string;
  label: string;
  top: number;
  shown: boolean;
  style: AnimatedStyle<ViewStyle>;
}) {
  const { color } = useTheme();
  return (
    <Animated.View
      pointerEvents={shown ? 'auto' : 'none'}
      style={[
        styles.strip,
        {
          height: top + STRIP_ROW,
          backgroundColor: color(stageColor(state)),
          shadowColor: color('--color-sticker-shadow'),
        },
        style,
      ]}
    >
      <View
        accessible={shown}
        accessibilityElementsHidden={!shown}
        importantForAccessibility={shown ? 'yes' : 'no-hide-descendants'}
        accessibilityLabel={label}
        testID="home-strip"
        style={styles.row}
      >
        <Mascot variant="side" size={28} outlined />
        <AppText
          variant="meta"
          numberOfLines={1}
          style={[styles.line, { color: color('--color-on-stage') }]}
        >
          {line}
        </AppText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  strip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    justifyContent: 'flex-end',
    shadowOffset: { width: 0, height: vars['--space-1'] },
    shadowOpacity: 1,
    shadowRadius: STRIP_SHADOW - vars['--space-1'],
  },
  row: {
    height: STRIP_ROW,
    flexDirection: 'row',
    alignItems: 'center',
    gap: vars['--space-2'],
    paddingHorizontal: vars['--space-4'],
  },
  line: { flex: 1, fontWeight: '600' },
});

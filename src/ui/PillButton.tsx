import { createContext, useContext } from 'react';
import { ActivityIndicator, PlatformColor, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { vars } from './theme/tokens';
import { useTheme } from './theme/useTheme';

type Variant = 'primary' | 'secondary' | 'destructive' | 'plain';

// Bars pinned over scrolling content need an opaque secondary fill and an opaque base under every pill, so neither a
// translucent fill nor the pressed and disabled dimming lets scrolled text show through and cross the label.
export const PinnedSurface = createContext(false);

export type PillButtonProps = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
};

export function PillButton({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  testID,
}: PillButtonProps) {
  const { color } = useTheme();
  const pinned = useContext(PinnedSurface);
  const inactive = disabled || loading;
  const labelColor =
    variant === 'primary'
      ? color('--color-on-accent')
      : variant === 'destructive'
        ? color('--color-urgent')
        : PlatformColor('label');
  const fill =
    variant === 'primary'
      ? color('--color-accent')
      : variant === 'destructive'
        ? PlatformColor('secondarySystemGroupedBackground')
        : variant === 'secondary'
          ? PlatformColor(pinned ? 'systemGray5' : 'tertiarySystemFill')
          : undefined;

  const button = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: fill },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <AppText variant="body" style={[styles.label, { color: labelColor }]}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
  if (!pinned) return button;
  return (
    <View style={[styles.base, { backgroundColor: PlatformColor('systemGroupedBackground') }]}>
      {button}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: vars['--radius-pill'], borderCurve: 'continuous' },
  button: {
    minHeight: vars['--touch-min'],
    borderRadius: vars['--radius-pill'],
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: vars['--space-5'],
    paddingVertical: vars['--space-3'],
  },
  pressed: { opacity: vars['--opacity-pressed'] },
  disabled: { opacity: 0.4 },
  label: { fontWeight: '600', textAlign: 'center' },
});

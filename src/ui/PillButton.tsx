import { ActivityIndicator, PlatformColor, Pressable, StyleSheet } from 'react-native';

import { AppText } from './AppText';
import { vars } from './theme/tokens';
import { useTheme } from './theme/useTheme';

type Variant = 'primary' | 'secondary' | 'destructive' | 'plain';

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
          ? PlatformColor('tertiarySystemFill')
          : undefined;

  return (
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
}

const styles = StyleSheet.create({
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

import { SymbolView, type SFSymbol } from 'expo-symbols';
import { createContext, useContext } from 'react';
import {
  ActivityIndicator,
  PlatformColor,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
} from 'react-native';

import { AppText } from './AppText';
import { vars } from './theme/tokens';
import { useTheme } from './theme/useTheme';

type Variant = 'primary' | 'secondary' | 'destructive' | 'plain';

// The bar itself hides scrolled content; systemGray5 stays to keep the look the owner accepted on 2026-11-06, a step
// brighter than tertiarySystemFill on the dark canvas.
export const PinnedSurface = createContext(false);

export type PillButtonProps = {
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  variant?: Variant;
  loading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
  symbol?: SFSymbol;
  testID?: string;
};

export function PillButton({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  loadingLabel,
  disabled = false,
  symbol,
  testID,
}: PillButtonProps) {
  const { color } = useTheme();
  const pinned = useContext(PinnedSurface);
  const inactive = disabled || loading;
  const greyed = disabled && !loading;
  const labelColor = greyed
    ? PlatformColor('tertiaryLabel')
    : variant === 'primary'
      ? color('--color-on-accent')
      : variant === 'destructive'
        ? color('--color-urgent')
        : PlatformColor('label');
  const secondaryFill = PlatformColor(pinned ? 'systemGray5' : 'tertiarySystemFill');
  const fill =
    variant === 'plain'
      ? undefined
      : greyed
        ? secondaryFill
        : variant === 'primary'
          ? color('--color-accent')
          : variant === 'destructive'
            ? PlatformColor('secondarySystemGroupedBackground')
            : secondaryFill;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={(loading && loadingLabel) || label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.button, { backgroundColor: fill }, pressed && styles.pressed]}
    >
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={labelColor} />
          {loadingLabel ? (
            <AppText variant="body" style={[styles.label, { color: labelColor }]}>
              {loadingLabel}
            </AppText>
          ) : null}
        </View>
      ) : symbol ? (
        <View style={styles.loading}>
          <SymbolView name={symbol} size={vars['--text-body']} tintColor={labelColor} />
          <AppText variant="body" style={[styles.label, styles.shrink, { color: labelColor }]}>
            {label}
          </AppText>
        </View>
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
  label: { fontWeight: '600', textAlign: 'center' },
  shrink: { flexShrink: 1 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: vars['--space-2'] },
});

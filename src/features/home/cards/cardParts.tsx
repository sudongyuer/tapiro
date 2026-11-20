import { SymbolView, type SFSymbol } from 'expo-symbols';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
  type AccessibilityState,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { AppText, type AppTextProps } from '@/ui/AppText';
import { PressDim } from '@/ui/PressDim';
import { MUTED_TEXT_OPACITY, vars } from '@/ui/theme/tokens';

export function CardText({
  ink,
  muted = false,
  style,
  ...rest
}: AppTextProps & { ink: string; muted?: boolean }) {
  return <AppText {...rest} style={[{ color: ink }, muted && styles.muted, style as TextStyle]} />;
}

export function Pill({
  ink,
  children,
  dot,
  symbol,
}: {
  ink: string;
  children: string;
  dot?: string;
  symbol?: SFSymbol;
}) {
  return (
    <View style={styles.pill}>
      <View style={[StyleSheet.absoluteFill, styles.pillFill, { backgroundColor: ink }]} />
      {dot ? <View style={[styles.dot, { backgroundColor: dot }]} /> : null}
      {symbol ? <SymbolView name={symbol} size={PILL_SYMBOL} tintColor={ink} /> : null}
      <AppText variant="meta" numberOfLines={1} style={[styles.pillText, { color: ink }]}>
        {children}
      </AppText>
    </View>
  );
}

export function CardHeader({ left, right }: { left: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>{left}</View>
      {right}
    </View>
  );
}

type CardButtonLook = 'filled' | 'tinted' | 'outlined';

export function CardButton({
  label,
  ink,
  surface,
  look = 'filled',
  onPress,
  disabled,
  busy = false,
  accessibilityLabel,
  accessibilityState,
  testID,
  style,
}: {
  label: string;
  ink: string;
  surface: string;
  look?: CardButtonLook;
  onPress?: () => void;
  disabled?: boolean;
  busy?: boolean;
  accessibilityLabel?: string;
  accessibilityState?: AccessibilityState;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const color = look === 'filled' ? surface : ink;
  const body = (
    <>
      {look === 'tinted' ? (
        <View style={[StyleSheet.absoluteFill, styles.tint, { backgroundColor: ink }]} />
      ) : null}
      {busy ? (
        <ActivityIndicator color={color} />
      ) : (
        <AppText variant="body" numberOfLines={2} style={[styles.buttonLabel, { color }]}>
          {label}
        </AppText>
      )}
    </>
  );
  const frame = [
    styles.button,
    look === 'filled' && { backgroundColor: ink },
    look === 'outlined' && [styles.outlined, { borderColor: ink }],
    style,
  ];
  if (!onPress) return <View style={frame}>{body}</View>;
  return (
    <PressDim
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled, busy, ...accessibilityState }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={frame}
    >
      {body}
    </PressDim>
  );
}

const PILL_SYMBOL = 15;

const styles = StyleSheet.create({
  muted: { opacity: MUTED_TEXT_OPACITY },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: vars['--space-2'],
    minHeight: vars['--capsule-min'],
    paddingHorizontal: vars['--space-3'],
    borderRadius: vars['--radius-pill'],
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  pillFill: { opacity: 0.12 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', gap: vars['--space-2'] },
  headerLeft: { flex: 1, minWidth: 0, alignItems: 'flex-start' },
  button: {
    minHeight: vars['--touch-min'],
    paddingHorizontal: vars['--space-4'],
    paddingVertical: vars['--space-2'],
    borderRadius: vars['--radius-pill'],
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tint: { opacity: 0.12 },
  outlined: { borderWidth: StyleSheet.hairlineWidth * 2 },
  buttonLabel: { fontWeight: '600', textAlign: 'center' },
});

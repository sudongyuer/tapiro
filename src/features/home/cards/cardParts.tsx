import { SymbolView, type SFSymbol } from 'expo-symbols';
import type { ReactNode } from 'react';
import { StyleSheet, View, type TextStyle } from 'react-native';

import { AppText, type AppTextProps } from '@/ui/AppText';
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

const PILL_SYMBOL = 15;

const styles = StyleSheet.create({
  muted: { opacity: MUTED_TEXT_OPACITY },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: vars['--space-2'],
    minHeight: vars['--space-6'],
    paddingHorizontal: vars['--space-3'],
    borderRadius: vars['--radius-pill'],
    overflow: 'hidden',
  },
  pillFill: { opacity: 0.12 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', gap: vars['--space-2'] },
  headerLeft: { flex: 1, minWidth: 0, alignItems: 'flex-start' },
});

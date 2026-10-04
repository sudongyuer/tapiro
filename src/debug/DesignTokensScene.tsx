import { SymbolView, type SFSymbol } from 'expo-symbols';
import { PlatformColor, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/ui/AppText';
import { typeRoles, vars, type TokenName } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

const STATUSES: { label: string; symbol: SFSymbol; color: TokenName | null }[] = [
  { label: '待接单', symbol: 'circle', color: null },
  { label: '进行中', symbol: 'circle.fill', color: '--color-accent' },
  { label: '待确认', symbol: 'exclamationmark.circle.fill', color: '--color-warning' },
  { label: '已完成', symbol: 'checkmark.circle.fill', color: '--color-success' },
  { label: '紧急', symbol: 'clock.badge.exclamationmark', color: '--color-urgent' },
];

export function DesignTokensScene({ onReady }: { onReady: () => void }) {
  const { color } = useTheme();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={styles.screen}
      contentContainerStyle={styles.content}
      onLayout={onReady}
    >
      <View style={styles.card}>
        {typeRoles.map((role) => (
          <AppText key={role} variant={role} testID={`tokens-type-${role}`}>
            {role === 'reward' ? 'RM 15' : `${role} 悬赏令`}
          </AppText>
        ))}
      </View>

      <View style={styles.card}>
        {STATUSES.map((status) => (
          <View
            key={status.label}
            accessible
            style={styles.statusRow}
            testID={`tokens-status-${status.symbol}`}
          >
            <SymbolView
              name={status.symbol}
              size={20}
              tintColor={status.color ? color(status.color) : PlatformColor('secondaryLabel')}
            />
            <AppText variant="body">{status.label}</AppText>
          </View>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        testID="tokens-primary-button"
        style={[styles.primary, { backgroundColor: color('--color-accent') }]}
      >
        <AppText
          variant="body"
          style={[styles.primaryLabel, { color: color('--color-on-accent') }]}
        >
          接单
        </AppText>
      </Pressable>

      <View
        accessible
        testID="tokens-moment"
        style={[styles.moment, { backgroundColor: color('--color-moment-bg') }]}
      >
        <AppText variant="moment-title">悬赏贴出去啦</AppText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PlatformColor('systemGroupedBackground') },
  content: { padding: vars['--space-4'], gap: vars['--space-4'] },
  card: {
    backgroundColor: PlatformColor('secondarySystemGroupedBackground'),
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
    padding: vars['--space-4'],
    gap: vars['--space-2'],
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: vars['--space-2'] },
  primary: {
    minHeight: vars['--touch-min'],
    borderRadius: vars['--radius-pill'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { fontWeight: '700' },
  moment: {
    borderRadius: vars['--radius-sheet'],
    borderCurve: 'continuous',
    padding: vars['--space-6'],
    alignItems: 'center',
  },
});

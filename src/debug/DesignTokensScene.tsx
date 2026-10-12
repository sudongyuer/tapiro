import type { ParseKeys } from 'i18next';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { PlatformColor, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { typeRoles, vars, type TokenName } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

const STATUSES: { labelKey: ParseKeys; symbol: SFSymbol; color: TokenName | null }[] = [
  { labelKey: 'debug.tokens.statusOpen', symbol: 'circle', color: null },
  { labelKey: 'debug.tokens.statusActive', symbol: 'circle.fill', color: '--color-accent' },
  {
    labelKey: 'debug.tokens.statusPending',
    symbol: 'exclamationmark.circle.fill',
    color: '--color-warning',
  },
  {
    labelKey: 'debug.tokens.statusDone',
    symbol: 'checkmark.circle.fill',
    color: '--color-success',
  },
  {
    labelKey: 'debug.tokens.statusUrgent',
    symbol: 'clock.badge.exclamationmark',
    color: '--color-urgent',
  },
];

export function DesignTokensScene({ onReady }: { onReady: () => void }) {
  const { color } = useTheme();
  const { t } = useI18n();

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
            {role === 'reward' ? t('debug.tokens.reward') : t('debug.tokens.roleSample', { role })}
          </AppText>
        ))}
      </View>

      <View style={styles.card}>
        {STATUSES.map((status) => (
          <View
            key={status.labelKey}
            accessible
            style={styles.statusRow}
            testID={`tokens-status-${status.symbol}`}
          >
            <SymbolView
              name={status.symbol}
              size={20}
              tintColor={status.color ? color(status.color) : PlatformColor('secondaryLabel')}
            />
            <AppText variant="body">{t(status.labelKey)}</AppText>
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
          {t('debug.tokens.accept')}
        </AppText>
      </Pressable>

      <View
        accessible
        testID="tokens-moment"
        style={[styles.moment, { backgroundColor: color('--color-moment-bg') }]}
      >
        <AppText variant="moment-title">{t('debug.tokens.posted')}</AppText>
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

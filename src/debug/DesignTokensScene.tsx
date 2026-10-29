import type { ParseKeys } from 'i18next';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { PlatformColor, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { formatMoney, type Money } from '@/lib/money';
import { AppText } from '@/ui/AppText';
import { HoldButton } from '@/ui/HoldButton';
import { Mascot } from '@/ui/Mascot';
import { typeRoles, vars, type TokenName } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

const CARDS = ['pay', 'ride', 'progress', 'calm'] as const;
const STAGES = ['urgent', 'live', 'calm'] as const;
const STICKERS = [
  'pickup',
  'buy',
  'queue',
  'handle',
  'move',
  'accompany',
  'study',
  'other',
] as const;

const noop = () => undefined;
const SAMPLE_AMOUNT: Money = { minor: 1500, currency: 'MYR' };

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
  const { t, language } = useI18n();
  const amount = formatMoney(SAMPLE_AMOUNT, language, { whole: true });

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={styles.screen}
      contentContainerStyle={styles.content}
      onLayout={onReady}
    >
      <HoldButton
        label={t('debug.tokens.hold')}
        holdingLabel={t('debug.tokens.holdHolding')}
        busyLabel={t('debug.tokens.holdBusy')}
        hint={t('debug.tokens.holdHint')}
        state="ready"
        onComplete={noop}
        onAccessibilityActivate={noop}
        testID="tokens-hold-button"
      />
      <HoldButton
        label={t('debug.tokens.hold')}
        holdingLabel={t('debug.tokens.holdHolding')}
        busyLabel={t('debug.tokens.holdBusy')}
        state="busy"
        onComplete={noop}
        onAccessibilityActivate={noop}
        testID="tokens-hold-busy"
      />

      <View style={styles.card}>
        {STAGES.map((stage) => (
          <View
            key={stage}
            accessible
            accessibilityLabel={t('debug.tokens.mascot')}
            testID={`tokens-stage-${stage}`}
            style={[styles.stage, { backgroundColor: color(`--color-stage-${stage}`) }]}
          >
            <Mascot variant={stage === 'calm' ? 'front' : 'side'} size={56} />
            <AppText variant="body" style={{ color: color('--color-on-stage') }}>
              {t('debug.tokens.liveSample', { amount })}
            </AppText>
          </View>
        ))}
      </View>

      <View style={[styles.card, styles.stickers]}>
        {STICKERS.map((sticker) => (
          <View
            key={sticker}
            accessible
            accessibilityLabel={sticker}
            testID={`tokens-sticker-${sticker}`}
            style={[styles.sticker, { backgroundColor: color(`--color-sticker-${sticker}`) }]}
          >
            <AppText variant="secondary" style={{ color: color('--color-on-sticker') }}>
              {sticker.slice(0, 1).toUpperCase()}
            </AppText>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        {typeRoles.map((role) => (
          <AppText key={role} variant={role} testID={`tokens-type-${role}`}>
            {role === 'reward'
              ? t('debug.tokens.reward', { amount })
              : t('debug.tokens.roleSample', { role })}
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

      <View style={styles.card}>
        {CARDS.map((card) => (
          <View
            key={card}
            accessible
            testID={`tokens-card-${card}`}
            style={[styles.liveCard, { backgroundColor: color(`--color-card-${card}`) }]}
          >
            <AppText variant="body" style={{ color: color(`--color-on-card-${card}`) }}>
              {t('debug.tokens.liveSample', { amount })}
            </AppText>
          </View>
        ))}
      </View>

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
  liveCard: {
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
    padding: vars['--space-4'],
  },
  stage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: vars['--space-3'],
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
    padding: vars['--space-3'],
  },
  stickers: { flexDirection: 'row', flexWrap: 'wrap' },
  sticker: {
    width: vars['--touch-min'],
    height: vars['--touch-min'],
    borderRadius: vars['--radius-chip'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  moment: {
    borderRadius: vars['--radius-sheet'],
    borderCurve: 'continuous',
    padding: vars['--space-6'],
    alignItems: 'center',
  },
});

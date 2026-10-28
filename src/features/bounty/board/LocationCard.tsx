import { SymbolView } from 'expo-symbols';
import { PlatformColor, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

const ICON = 20;

export function LocationCard({
  busy,
  onAllow,
  onLater,
}: {
  busy: boolean;
  onAllow: () => void;
  onLater: () => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const title = t('bounty.board.location.title');
  const body = t('bounty.board.location.body');
  return (
    <View style={styles.card}>
      <View
        accessible
        accessibilityLabel={`${title}\n${body}`}
        testID="bounty-location-card"
        style={styles.message}
      >
        <SymbolView name="location.fill" size={ICON} tintColor={color('--color-accent')} />
        <View style={styles.text}>
          <AppText variant="body" style={styles.title}>
            {title}
          </AppText>
          <AppText variant="secondary" tone="secondaryLabel">
            {body}
          </AppText>
        </View>
      </View>
      <View style={styles.actions}>
        <PillButton
          label={t('bounty.board.location.allow')}
          loading={busy}
          onPress={onAllow}
          testID="bounty-location-allow"
        />
        <PillButton
          label={t('bounty.board.location.later')}
          variant="secondary"
          disabled={busy}
          onPress={onLater}
          testID="bounty-location-later"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: vars['--space-3'],
    padding: vars['--space-4'],
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
    backgroundColor: PlatformColor('secondarySystemGroupedBackground'),
  },
  message: { flexDirection: 'row', alignItems: 'flex-start', gap: vars['--space-3'] },
  text: { flex: 1, gap: vars['--space-1'] },
  title: { fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: vars['--space-2'] },
});

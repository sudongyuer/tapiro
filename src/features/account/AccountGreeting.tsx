import { PlatformColor, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { Avatar } from '@/ui/Avatar';
import { vars } from '@/ui/theme/tokens';

export function AccountGreeting({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const { t } = useI18n();
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Avatar uri={avatarUrl} size={48} label={t('account.name.avatar')} />
        <AppText variant="title" style={styles.greeting} testID="home-greeting">
          {t('account.home.greeting', { name })}
        </AppText>
      </View>
      <AppText variant="secondary" tone="secondaryLabel">
        {t('account.home.comingSoon')}
      </AppText>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: vars['--space-3'] },
  greeting: { flex: 1 },
});

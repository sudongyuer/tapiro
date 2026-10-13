import { PlatformColor, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { Mascot } from '@/ui/Mascot';
import { vars } from '@/ui/theme/tokens';

export function BountySection() {
  const { t } = useI18n();
  return (
    <View style={styles.section}>
      <AppText variant="title" accessibilityRole="header" style={styles.title}>
        {t('home.section.title')}
      </AppText>
      <View accessible testID="bounty-section-placeholder" style={styles.empty}>
        <Mascot variant="front" size={32} />
        <AppText variant="secondary" tone="secondaryLabel" style={styles.text}>
          {t('home.section.empty')}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: vars['--space-3'], paddingTop: vars['--space-6'] },
  title: { fontWeight: '700', paddingHorizontal: 2 },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: vars['--space-3'],
    padding: vars['--space-4'],
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
    backgroundColor: PlatformColor('secondarySystemGroupedBackground'),
  },
  text: { flex: 1 },
});

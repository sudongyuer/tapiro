import { ScrollView, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { vars } from '@/ui/theme/tokens';

import type { LegalPage } from './linkSegments';

const SECTIONS = {
  terms: ['about', 'account', 'money'],
  privacy: ['collect', 'ai', 'store', 'delete'],
} as const;

export function LegalDocument({ page }: { page: LegalPage }) {
  const { t } = useI18n();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      testID={`legal-${page}`}
    >
      <AppText variant="secondary" tone="secondaryLabel" testID="legal-draft">
        {t('account.legal.draft')}
      </AppText>
      {SECTIONS[page].map((section) => (
        <View key={section} style={styles.section}>
          <AppText variant="title" accessibilityRole="header">
            {t(`account.legal.${page}.${section}Title` as 'account.legal.terms.aboutTitle')}
          </AppText>
          <AppText variant="body">
            {t(`account.legal.${page}.${section}` as 'account.legal.terms.about')}
          </AppText>
        </View>
      ))}
      <AppText variant="body">{t('account.legal.contact')}</AppText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: vars['--space-5'], gap: vars['--space-6'] },
  section: { gap: vars['--space-2'] },
});

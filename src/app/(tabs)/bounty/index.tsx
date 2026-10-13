import { PlatformColor, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { useHomeScroll } from '@/features/shell';
import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { Mascot } from '@/ui/Mascot';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

export default function BountyHome() {
  const { t } = useI18n();
  const { color } = useTheme();
  const { height } = useWindowDimensions();
  const { scrollViewProps, onLiveCardsLayout } = useHomeScroll();

  return (
    <ScrollView
      {...scrollViewProps}
      testID="home-scroll"
      contentInsetAdjustmentBehavior="automatic"
      style={styles.screen}
      contentContainerStyle={[styles.content, { minHeight: height * 2 }]}
    >
      <View
        accessible
        testID="home-live-cards"
        onLayout={onLiveCardsLayout}
        style={[styles.liveCards, { backgroundColor: color('--color-card-calm') }]}
      >
        <Mascot variant="side" size={32} />
        <AppText variant="body" style={[styles.liveText, { color: color('--color-on-card-calm') }]}>
          {t('shell.home.liveCards')}
        </AppText>
      </View>
      <AppText variant="title" accessibilityRole="header">
        {t('shell.home.sectionTitle')}
      </AppText>
      <AppText variant="secondary" tone="secondaryLabel">
        {t('shell.home.placeholder')}
      </AppText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PlatformColor('systemGroupedBackground') },
  content: { padding: vars['--space-4'], gap: vars['--space-3'] },
  liveCards: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: vars['--space-3'],
    minHeight: vars['--touch-min'] * 4,
    padding: vars['--space-4'],
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
  },
  liveText: { flex: 1 },
});

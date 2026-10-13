import { PlatformColor, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { vars } from '@/ui/theme/tokens';

import { SignInButtons } from './SignInButtons';

export function WelcomeScreen({ onLayout }: { onLayout?: () => void }) {
  const { t } = useI18n();
  return (
    <SafeAreaView style={styles.screen} testID="welcome-screen" onLayout={onLayout}>
      <ScrollView contentContainerStyle={styles.content} bounces={false}>
        <View style={styles.intro}>
          <AppText variant="large-title" accessibilityRole="header">
            {t('account.welcome.title')}
          </AppText>
          <AppText variant="body" tone="secondaryLabel">
            {t('account.welcome.tagline')}
          </AppText>
        </View>
        <SignInButtons />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PlatformColor('systemGroupedBackground') },
  content: {
    flexGrow: 1,
    justifyContent: 'space-between',
    padding: vars['--space-5'],
    gap: vars['--space-7'],
  },
  intro: { gap: vars['--space-2'], paddingTop: vars['--space-7'] },
});

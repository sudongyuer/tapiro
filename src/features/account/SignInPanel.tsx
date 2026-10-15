import { PlatformColor, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { SignInButtons } from './SignInButtons';
import { useRise } from './welcomeMotion';

const OVERSHOOT_BLEED = vars['--space-7'];

export function SignInPanel({ onMeasure }: { onMeasure: (visibleHeight: number) => void }) {
  const { t } = useI18n();
  const { color } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const { style, height } = useRise();
  return (
    <Animated.View
      onLayout={(event) => {
        const { height: full } = event.nativeEvent.layout;
        height.set(full);
        onMeasure(full - OVERSHOOT_BLEED);
      }}
      style={[
        styles.panel,
        {
          paddingBottom: Math.max(bottom, vars['--space-5']) + OVERSHOOT_BLEED,
          shadowColor: color('--color-sticker-shadow'),
        },
        style,
      ]}
    >
      <View style={styles.intro}>
        <AppText
          variant="title"
          accessibilityRole="header"
          testID="welcome-headline"
          style={styles.headline}
        >
          {t('account.welcome.headline')}
        </AppText>
        <AppText variant="secondary" tone="secondaryLabel" style={styles.center}>
          {t('account.welcome.subline')}
        </AppText>
      </View>
      <SignInButtons />
      <AppText variant="meta" tone="secondaryLabel" style={styles.center} testID="welcome-terms">
        {t('account.welcome.terms')}
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -OVERSHOOT_BLEED,
    gap: vars['--space-4'],
    paddingTop: vars['--space-6'],
    paddingHorizontal: vars['--space-5'],
    borderTopLeftRadius: vars['--radius-sheet'],
    borderTopRightRadius: vars['--radius-sheet'],
    borderCurve: 'continuous',
    backgroundColor: PlatformColor('secondarySystemGroupedBackground'),
    shadowOffset: { width: 0, height: -vars['--space-2'] },
    shadowOpacity: 1,
    shadowRadius: vars['--space-5'],
  },
  intro: { gap: vars['--space-1'] },
  headline: { textAlign: 'center', fontWeight: '800' },
  center: { textAlign: 'center' },
});

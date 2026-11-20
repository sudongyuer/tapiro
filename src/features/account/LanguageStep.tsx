import { Form, Host } from '@expo/ui/swift-ui';
import { scrollContentBackground, tint } from '@expo/ui/swift-ui/modifiers';
import { PlatformColor, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/lib/i18n';
import { InkText } from '@/ui/InkText';
import { MascotSays } from '@/ui/MascotSays';
import { MomentBackground } from '@/ui/MomentBackground';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { LanguagePickerSection } from './LanguagePicker';

// The heading stays in React Native above the Form: hosted in a Form row through RNHostView, the en question's
// second line lost the stem of its first glyph (「orefer?」, audit O2, 2026-11-21).
export function LanguageStep({ onDone, onLayout }: { onDone: () => void; onLayout?: () => void }) {
  const { t } = useI18n();
  const { color } = useTheme();
  const { top, bottom } = useSafeAreaInsets();
  return (
    <MomentBackground onLayout={onLayout} testID="language-step">
      <View style={[styles.heading, { paddingTop: top + vars['--space-7'] }]}>
        <MascotSays line={t('account.language.greeting')} />
        <InkText
          variant="moment-title"
          outline={vars['--sticker-border']}
          ink={PlatformColor('label')}
          accessibilityRole="header"
          testID="language-question"
        >
          {t('account.language.question')}
        </InkText>
      </View>
      <Host style={styles.form}>
        <Form modifiers={[tint(color('--color-accent')), scrollContentBackground('hidden')]}>
          <LanguagePickerSection footer={t('account.language.footer')} onMoment />
        </Form>
      </Host>
      <View style={[styles.actions, { paddingBottom: bottom + vars['--space-4'] }]}>
        <PillButton label={t('account.language.done')} onPress={onDone} testID="language-done" />
      </View>
    </MomentBackground>
  );
}

const styles = StyleSheet.create({
  form: { flex: 1 },
  heading: { gap: vars['--space-6'], paddingHorizontal: vars['--space-6'] },
  actions: { paddingHorizontal: vars['--space-6'], paddingTop: vars['--space-2'] },
});

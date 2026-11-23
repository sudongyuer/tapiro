import { Form, Host, RNHostView, Section } from '@expo/ui/swift-ui';
import {
  listRowBackground,
  listRowInsets,
  listSectionMargins,
  scrollContentBackground,
  tint,
} from '@expo/ui/swift-ui/modifiers';
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

const OUTLINE = vars['--sticker-border'];

// The heading scrolls with the rows so all three languages stay reachable at the largest text sizes. Its hosted view
// is wider than the column by the outline on each side: flush with the hosted edge, the en question's second line
// lost the stem of its first glyph (「orefer?」, audit O2, 2026-11-21).
export function LanguageStep({ onDone, onLayout }: { onDone: () => void; onLayout?: () => void }) {
  const { t } = useI18n();
  const { color } = useTheme();
  const { bottom } = useSafeAreaInsets();
  return (
    <MomentBackground onLayout={onLayout} testID="language-step">
      <Host style={styles.form}>
        <Form modifiers={[tint(color('--color-accent')), scrollContentBackground('hidden')]}>
          <Section
            modifiers={[
              listRowBackground('clear'),
              listRowInsets({ top: 0, leading: 0, bottom: 0, trailing: 0 }),
              listSectionMargins({ length: 0, edges: 'top' }),
              listSectionMargins({ length: vars['--space-6'] - OUTLINE, edges: 'horizontal' }),
            ]}
          >
            <RNHostView matchContents={{ vertical: true }}>
              <View style={styles.heading}>
                <MascotSays line={t('account.language.greeting')} />
                <InkText
                  variant="moment-title"
                  outline={OUTLINE}
                  ink={PlatformColor('label')}
                  accessibilityRole="header"
                  testID="language-question"
                >
                  {t('account.language.question')}
                </InkText>
              </View>
            </RNHostView>
          </Section>
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
  heading: {
    gap: vars['--space-6'],
    paddingTop: vars['--space-4'],
    paddingHorizontal: OUTLINE,
  },
  actions: { paddingHorizontal: vars['--space-6'], paddingTop: vars['--space-2'] },
});

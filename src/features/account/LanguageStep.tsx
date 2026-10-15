import { Form, Group, Host, RNHostView } from '@expo/ui/swift-ui';
import {
  listRowBackground,
  listRowInsets,
  scrollContentBackground,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { MascotSays } from '@/ui/MascotSays';
import { MomentBackground } from '@/ui/MomentBackground';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { LanguagePickerSection } from './LanguagePicker';

export function LanguageStep({ onDone, onLayout }: { onDone: () => void; onLayout?: () => void }) {
  const { t } = useI18n();
  const { color } = useTheme();
  const { bottom } = useSafeAreaInsets();
  return (
    <MomentBackground onLayout={onLayout} testID="language-step">
      <Host style={styles.form}>
        <Form modifiers={[tint(color('--color-accent')), scrollContentBackground('hidden')]}>
          <Group
            modifiers={[
              listRowBackground('clear'),
              listRowInsets({ top: 0, leading: 0, bottom: 0, trailing: 0 }),
            ]}
          >
            <RNHostView matchContents={{ vertical: true }}>
              <View style={styles.heading}>
                <MascotSays line={t('account.language.greeting')} />
                <AppText variant="moment-title" accessibilityRole="header">
                  {t('account.language.question')}
                </AppText>
              </View>
            </RNHostView>
          </Group>
          <LanguagePickerSection footer={t('account.language.footer')} />
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
  heading: { gap: vars['--space-6'], paddingTop: vars['--space-4'] },
  actions: { paddingHorizontal: vars['--space-6'], paddingTop: vars['--space-2'] },
});

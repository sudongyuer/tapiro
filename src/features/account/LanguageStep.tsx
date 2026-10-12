import { Form, Host } from '@expo/ui/swift-ui';
import { PlatformColor, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/lib/i18n';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';

import { LanguagePickerSection } from './LanguagePicker';

export function LanguageStep({ onDone, onLayout }: { onDone: () => void; onLayout?: () => void }) {
  const { t } = useI18n();
  const { bottom } = useSafeAreaInsets();
  return (
    <View style={styles.screen} onLayout={onLayout} testID="language-step">
      <Host style={styles.form}>
        <Form>
          <LanguagePickerSection footer={t('account.language.footer')} />
        </Form>
      </Host>
      <View style={[styles.actions, { paddingBottom: bottom + vars['--space-4'] }]}>
        <PillButton label={t('account.language.done')} onPress={onDone} testID="language-done" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PlatformColor('systemGroupedBackground') },
  form: { flex: 1 },
  actions: { paddingHorizontal: vars['--space-4'], paddingTop: vars['--space-2'] },
});

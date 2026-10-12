import { Button, Form, HStack, Host, Image, Section, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityHidden,
  accessibilityIdentifier,
  font,
  foregroundStyle,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { StyleSheet } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { LanguagePickerSection } from './LanguagePicker';

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });

export function SettingsView({
  name,
  email,
  onSignOut,
  onDeleteAccount,
}: {
  name: string;
  email: string | null;
  onSignOut: () => void;
  onDeleteAccount: () => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  return (
    <Host style={styles.host} testID="settings-screen">
      <Form modifiers={[tint(color('--color-accent'))]}>
        <Section>
          <HStack
            spacing={vars['--space-3']}
            modifiers={[
              accessibilityElement('combine'),
              accessibilityIdentifier('settings-profile'),
            ]}
          >
            <Image
              systemName="person.crop.circle.fill"
              size={44}
              modifiers={[secondary, accessibilityHidden()]}
            />
            <VStack alignment="leading" spacing={vars['--space-1']}>
              <Text>{name}</Text>
              {email ? (
                <Text modifiers={[font({ textStyle: 'subheadline' }), secondary]}>{email}</Text>
              ) : null}
            </VStack>
          </HStack>
        </Section>
        <LanguagePickerSection />
        <Section>
          <Button
            label={t('account.settings.signOut')}
            modifiers={[foregroundStyle(color('--color-accent'))]}
            onPress={onSignOut}
            testID="settings-sign-out"
          />
        </Section>
        <Section footer={<Text>{t('account.settings.deleteFooter')}</Text>}>
          <Button
            label={t('account.settings.deleteAccount')}
            role="destructive"
            modifiers={[foregroundStyle(color('--color-urgent'))]}
            onPress={onDeleteAccount}
            testID="settings-delete"
          />
        </Section>
      </Form>
    </Host>
  );
}

const styles = StyleSheet.create({ host: { flex: 1 } });

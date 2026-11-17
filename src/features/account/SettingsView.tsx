import {
  Button,
  Form,
  HStack,
  Host,
  ProgressView,
  RNHostView,
  Section,
  Text,
  VStack,
} from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityIdentifier,
  font,
  foregroundStyle,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { StyleSheet } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { Avatar } from '@/ui/Avatar';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { LanguagePickerSection } from './LanguagePicker';

const AVATAR_SIZE = 44;
const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });

export function SettingsView({
  name,
  email,
  avatarUrl,
  onSignOut,
  onDeleteAccount,
  signingOut = false,
}: {
  name: string;
  email: string | null;
  avatarUrl: string | null;
  signingOut?: boolean;
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
            <RNHostView matchContents>
              <Avatar uri={avatarUrl} size={AVATAR_SIZE} label={t('account.name.avatar')} />
            </RNHostView>
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
          {signingOut ? (
            <HStack
              spacing={vars['--space-2']}
              modifiers={[
                accessibilityElement('combine'),
                accessibilityIdentifier('settings-signing-out'),
              ]}
            >
              <ProgressView />
              <Text modifiers={[secondary]}>{t('account.settings.signingOut')}</Text>
            </HStack>
          ) : (
            <Button
              label={t('account.settings.signOut')}
              modifiers={[foregroundStyle(color('--color-accent'))]}
              onPress={onSignOut}
              testID="settings-sign-out"
            />
          )}
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

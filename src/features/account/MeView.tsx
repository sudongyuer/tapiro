import {
  Button,
  Form,
  HStack,
  Host,
  Image,
  RNHostView,
  Section,
  Spacer,
  Text,
} from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityHidden,
  accessibilityIdentifier,
  accessibilityLabel,
  font,
  foregroundStyle,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { StyleSheet } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { Avatar } from '@/ui/Avatar';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

const AVATAR_SIZE = 60;
const tertiary = foregroundStyle({ type: 'hierarchical', style: 'tertiary' });

export function MeView({
  name,
  avatarUrl,
  payeeDue,
  onOpenPayee,
  onOpenSettings,
}: {
  name: string;
  avatarUrl: string | null;
  payeeDue: boolean;
  onOpenPayee: () => void;
  onOpenSettings: () => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  return (
    <Host style={styles.host} testID="me-screen">
      <Form modifiers={[tint(color('--color-accent'))]}>
        <Section>
          <HStack
            spacing={vars['--space-4']}
            modifiers={[accessibilityElement('combine'), accessibilityIdentifier('me-profile')]}
          >
            <RNHostView matchContents>
              <Avatar uri={avatarUrl} size={AVATAR_SIZE} label={t('account.name.avatar')} />
            </RNHostView>
            <Text modifiers={[font({ textStyle: 'title2', weight: 'bold' })]}>{name}</Text>
          </HStack>
        </Section>
        <Section>
          <NavRow
            label={t('payee.meRow')}
            dotLabel={payeeDue ? t('payee.meRowDue') : null}
            onPress={onOpenPayee}
            testID="me-payee"
          />
          <NavRow label={t('account.me.settings')} onPress={onOpenSettings} testID="me-settings" />
        </Section>
      </Form>
    </Host>
  );
}

function NavRow({
  label,
  dotLabel = null,
  onPress,
  testID,
}: {
  label: string;
  dotLabel?: string | null;
  onPress: () => void;
  testID: string;
}) {
  const { color } = useTheme();
  return (
    <Button onPress={onPress} testID={testID}>
      <HStack spacing={vars['--space-2']}>
        <Text modifiers={[foregroundStyle({ type: 'hierarchical', style: 'primary' })]}>
          {label}
        </Text>
        <Spacer />
        {dotLabel ? (
          <Image
            systemName="circle.fill"
            size={10}
            modifiers={[
              foregroundStyle(color('--color-urgent')),
              accessibilityLabel(dotLabel),
              accessibilityIdentifier(`${testID}-dot`),
            ]}
          />
        ) : null}
        <Image systemName="chevron.right" size={14} modifiers={[tertiary, accessibilityHidden()]} />
      </HStack>
    </Button>
  );
}

const styles = StyleSheet.create({ host: { flex: 1 } });

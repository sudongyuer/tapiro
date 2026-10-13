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
  onOpenSettings,
}: {
  name: string;
  avatarUrl: string | null;
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
          <Button onPress={onOpenSettings} testID="me-settings">
            <HStack>
              <Text modifiers={[foregroundStyle({ type: 'hierarchical', style: 'primary' })]}>
                {t('account.me.settings')}
              </Text>
              <Spacer />
              <Image
                systemName="chevron.right"
                size={14}
                modifiers={[tertiary, accessibilityHidden()]}
              />
            </HStack>
          </Button>
        </Section>
      </Form>
    </Host>
  );
}

const styles = StyleSheet.create({ host: { flex: 1 } });

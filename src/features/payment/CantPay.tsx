import { HStack, Image, ProgressView, Section, Text } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityHidden,
  accessibilityIdentifier,
  accessibilityLabel,
  font,
} from '@expo/ui/swift-ui/modifiers';

import { useI18n } from '@/lib/i18n';
import { vars } from '@/ui/theme/tokens';

import { ActionButton, secondary } from './formParts';

export function CantPaySection({
  name,
  reported,
  sending,
  disabled,
  onPress,
}: {
  name: string;
  reported: boolean;
  sending: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const { t } = useI18n();
  if (reported)
    return (
      <Section>
        <HStack
          alignment="top"
          spacing={vars['--space-2']}
          modifiers={[
            accessibilityElement('combine'),
            accessibilityIdentifier('pay-cant-pay-sent'),
          ]}
        >
          <Image
            systemName="checkmark.bubble"
            size={17}
            modifiers={[secondary, accessibilityHidden()]}
          />
          <Text modifiers={[font({ textStyle: 'subheadline' }), secondary]}>
            {t('pay.sheet.cantPay.sent', { name })}
          </Text>
        </HStack>
      </Section>
    );
  return (
    <Section footer={<Text>{t('pay.sheet.cantPay.footer', { name })}</Text>}>
      {sending ? (
        <ProgressView
          modifiers={[
            accessibilityLabel(t('pay.sheet.cantPay.sending')),
            accessibilityIdentifier('pay-cant-pay-busy'),
          ]}
        />
      ) : (
        <ActionButton
          label={t('pay.sheet.cantPay.action', { name })}
          tone="plain"
          onPress={onPress}
          disabled={disabled}
          testID="pay-cant-pay"
        />
      )}
    </Section>
  );
}

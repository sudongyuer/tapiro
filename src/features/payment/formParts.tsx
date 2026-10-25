import { Button, HStack, Section, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityIdentifier,
  buttonStyle,
  controlSize,
  disabled as disabledModifier,
  font,
  foregroundStyle,
  monospacedDigit,
  textSelection,
} from '@expo/ui/swift-ui/modifiers';
import { useEffect, useState } from 'react';

import { useI18n } from '@/lib/i18n';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { payDevice } from './services';

export const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
const COPIED_MS = 2000;

export function CopyRow({
  label,
  value,
  copyValue = value,
  testID,
}: {
  label: string;
  value: string;
  copyValue?: string;
  testID: string;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);
  return (
    <HStack spacing={vars['--space-3']}>
      <VStack
        alignment="leading"
        spacing={vars['--space-1'] / 2}
        modifiers={[accessibilityElement('combine'), accessibilityIdentifier(`${testID}-value`)]}
      >
        <Text modifiers={[font({ textStyle: 'subheadline' }), secondary]}>{label}</Text>
        <Text
          modifiers={[
            font({ textStyle: 'body', weight: 'semibold' }),
            monospacedDigit(),
            textSelection(true),
          ]}
        >
          {value}
        </Text>
      </VStack>
      <Spacer />
      <Button
        label={copied ? t('pay.sheet.copied') : t('pay.sheet.copy')}
        systemImage={copied ? 'checkmark' : 'doc.on.doc'}
        onPress={async () => {
          await payDevice.copy(copyValue);
          setCopied(true);
        }}
        testID={`${testID}-copy`}
        modifiers={[
          buttonStyle('bordered'),
          controlSize('small'),
          accessibilityIdentifier(`${testID}-copy`),
        ]}
      />
    </HStack>
  );
}

export function ActionButton({
  label,
  onPress,
  testID,
  tone = 'accent',
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  testID: string;
  tone?: 'accent' | 'plain' | 'urgent';
  disabled?: boolean;
}) {
  const { color } = useTheme();
  const tint =
    tone === 'accent'
      ? foregroundStyle(color('--color-accent'))
      : tone === 'urgent'
        ? foregroundStyle(color('--color-urgent'))
        : foregroundStyle({ type: 'hierarchical', style: 'primary' });
  return (
    <Button
      label={label}
      onPress={onPress}
      testID={testID}
      modifiers={[
        tint,
        font({ textStyle: 'body', weight: tone === 'accent' ? 'semibold' : 'regular' }),
        disabledModifier(disabled),
      ]}
    />
  );
}

export function TextSection({
  title,
  body,
  testID,
}: {
  title: string;
  body?: string;
  testID: string;
}) {
  return (
    <Section>
      <VStack
        alignment="leading"
        spacing={vars['--space-1']}
        modifiers={[accessibilityElement('combine'), accessibilityIdentifier(testID)]}
      >
        <Text modifiers={[font({ textStyle: 'headline' })]}>{title}</Text>
        {body ? (
          <Text modifiers={[font({ textStyle: 'subheadline' }), secondary]}>{body}</Text>
        ) : null}
      </VStack>
    </Section>
  );
}

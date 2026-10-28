import { Button, HStack, Image, ProgressView, Section, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityHidden,
  accessibilityIdentifier,
  accessibilityLabel,
  font,
  foregroundStyle,
  listRowBackground,
} from '@expo/ui/swift-ui/modifiers';
import type { SFSymbol } from 'sf-symbols-typescript';

import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

const TONES = {
  urgent: { text: '--color-urgent', fill: '--color-urgent-fill' },
  warning: { text: '--color-warning', fill: '--color-warning-fill' },
} as const;

export function NoticeCard({
  tone,
  icon,
  title,
  body,
  action,
  testID,
}: {
  tone: keyof typeof TONES;
  icon: SFSymbol;
  title: string;
  body?: string;
  action?: { label: string; onPress: () => void; testID: string; busy?: boolean };
  testID: string;
}) {
  const { color } = useTheme();
  const accent = color(TONES[tone].text);
  return (
    <Section modifiers={[listRowBackground(color(TONES[tone].fill))]}>
      <HStack
        alignment="top"
        spacing={vars['--space-3']}
        modifiers={[accessibilityElement('combine'), accessibilityIdentifier(testID)]}
      >
        <Image
          systemName={icon}
          size={20}
          modifiers={[foregroundStyle(accent), accessibilityHidden()]}
        />
        <VStack alignment="leading" spacing={vars['--space-1']}>
          <Text modifiers={[font({ textStyle: 'headline' }), foregroundStyle(accent)]}>
            {title}
          </Text>
          {body ? <Text modifiers={[font({ textStyle: 'subheadline' })]}>{body}</Text> : null}
        </VStack>
      </HStack>
      {action?.busy ? (
        <ProgressView
          modifiers={[
            accessibilityLabel(action.label),
            accessibilityIdentifier(`${action.testID}-busy`),
          ]}
        />
      ) : action ? (
        <Button
          label={action.label}
          onPress={action.onPress}
          testID={action.testID}
          modifiers={[foregroundStyle(accent)]}
        />
      ) : null}
    </Section>
  );
}

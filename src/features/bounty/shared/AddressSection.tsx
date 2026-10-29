import { Button, HStack, ProgressView, Section, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityIdentifier,
  accessibilityLabel,
  fixedSize,
  font,
  foregroundStyle,
  frame,
} from '@expo/ui/swift-ui/modifiers';
import type { ReactNode } from 'react';

import { useI18n } from '@/lib/i18n';
import { vars } from '@/ui/theme/tokens';

import type { AddressView } from './exactAddress';

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
const wraps = fixedSize({ horizontal: false, vertical: true });
const fill = frame({ maxWidth: Infinity, alignment: 'leading' });

function AddressRow({
  address,
  onRetry,
  testID,
}: {
  address: AddressView;
  onRetry?: () => void;
  testID: string;
}) {
  const { t } = useI18n();
  if (address.kind === 'loading') {
    return (
      <HStack spacing={vars['--space-2']} modifiers={[fill]}>
        <ProgressView
          modifiers={[
            accessibilityLabel(t('bounty.address.loading')),
            accessibilityIdentifier(`${testID}-loading`),
          ]}
        />
        <Text modifiers={[secondary]}>{t('bounty.address.loading')}</Text>
      </HStack>
    );
  }
  if (address.kind === 'failed') {
    return (
      <HStack spacing={vars['--space-2']} modifiers={[fill]}>
        <Text modifiers={[secondary, fill, wraps, accessibilityIdentifier(`${testID}-failed`)]}>
          {t('bounty.address.failed')}
        </Text>
        {onRetry ? (
          <Button
            label={t('bounty.address.retry')}
            onPress={onRetry}
            testID={`${testID}-retry`}
            modifiers={[frame({ minHeight: vars['--touch-min'] })]}
          />
        ) : null}
      </HStack>
    );
  }
  if (address.kind === 'none') return null;
  return (
    <VStack
      alignment="leading"
      spacing={vars['--space-1']}
      modifiers={[fill, accessibilityElement('combine'), accessibilityIdentifier(testID)]}
    >
      <Text modifiers={[font({ textStyle: 'footnote' }), secondary]}>
        {t('bounty.address.row')}
      </Text>
      <Text modifiers={[font({ textStyle: 'body' }), wraps]}>{address.address}</Text>
    </VStack>
  );
}

export function AddressSection({
  address,
  name,
  onRetry,
  testID,
  children,
}: {
  address: AddressView;
  name: string | null;
  onRetry?: () => void;
  testID: string;
  children?: ReactNode;
}) {
  const { t } = useI18n();
  if (!children && address.kind === 'none') return null;
  return (
    <Section
      footer={
        name && address.kind === 'shown' ? (
          <Text>{t('bounty.address.footer', { name })}</Text>
        ) : undefined
      }
    >
      {children}
      <AddressRow address={address} onRetry={onRetry} testID={testID} />
    </Section>
  );
}

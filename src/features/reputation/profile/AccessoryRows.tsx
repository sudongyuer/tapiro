import { Button, HStack, Image, ProgressView, Text } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityIdentifier,
  accessibilityLabel,
  contentShape,
  fixedSize,
  font,
  foregroundStyle,
  frame,
  shapes,
} from '@expo/ui/swift-ui/modifiers';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { useI18n } from '@/lib/i18n';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { useAccessoryState } from '../hooks';
import { accessoryLevel } from '../model';
import { meStore } from '../services';
import { ACCESSORIES, type Accessory } from '../types';

const primary = foregroundStyle({ type: 'hierarchical', style: 'primary' });
const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
const tertiary = foregroundStyle({ type: 'hierarchical', style: 'tertiary' });
const fill = frame({ maxWidth: Infinity, alignment: 'leading' });

export function AccessoryRows({ level, worn }: { level: number; worn: Accessory | null }) {
  const { t } = useI18n();
  const { color } = useTheme();
  const state = useAccessoryState();

  useFocusEffect(useCallback(() => () => meStore.clearAccessoryFailure(), []));

  return (
    <>
      {ACCESSORIES.map((accessory) => {
        const unlocksAt = accessoryLevel(accessory);
        const name = t(`reputation.accessory.${accessory}`);
        const identifier = `profile-accessory-${accessory}`;
        if (unlocksAt > level) {
          return (
            <HStack
              key={accessory}
              spacing={vars['--space-3']}
              modifiers={[
                accessibilityElement('ignore'),
                accessibilityLabel(
                  t('reputation.profile.accessoryLockedA11y', { name, level: unlocksAt }),
                ),
                accessibilityIdentifier(identifier),
              ]}
            >
              <Text modifiers={[fill, secondary]}>{name}</Text>
              <Text modifiers={[secondary, font({ textStyle: 'footnote' })]}>
                {t('reputation.profile.accessoryLocked', { level: unlocksAt })}
              </Text>
              <Image systemName="lock.fill" size={15} modifiers={[tertiary]} />
            </HStack>
          );
        }
        const wearing = accessory === worn;
        const sending = state.phase === 'sending' && state.accessory === accessory;
        return (
          <Button
            key={accessory}
            onPress={() => {
              if (!wearing) void meStore.setAccessory(accessory);
            }}
            testID={identifier}
            modifiers={[
              accessibilityLabel(
                wearing
                  ? t('reputation.profile.accessoryWornA11y', { name })
                  : t('reputation.profile.accessoryUnlockedA11y', { name }),
              ),
            ]}
          >
            <HStack spacing={vars['--space-3']} modifiers={[contentShape(shapes.rectangle())]}>
              <Text modifiers={[fill, primary]}>{name}</Text>
              {sending ? <ProgressView /> : null}
              {wearing && !sending ? (
                <Image
                  systemName="checkmark"
                  size={15}
                  modifiers={[foregroundStyle(color('--color-success'))]}
                />
              ) : null}
            </HStack>
          </Button>
        );
      })}
      {state.phase === 'failed' ? (
        <Text
          modifiers={[
            foregroundStyle(color('--color-urgent')),
            font({ textStyle: 'footnote' }),
            fixedSize({ horizontal: false, vertical: true }),
            accessibilityIdentifier('profile-accessory-failed'),
          ]}
        >
          {t('reputation.profile.accessoryFailed')}
        </Text>
      ) : null}
    </>
  );
}

import {
  Button,
  HStack,
  ProgressView,
  RNHostView,
  Section,
  Spacer,
  Text,
  VStack,
} from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityIdentifier,
  accessibilityLabel,
  disabled,
  font,
  foregroundStyle,
  frame,
} from '@expo/ui/swift-ui/modifiers';
import { Image } from 'expo-image';

import { useI18n } from '@/lib/i18n';
import { vars } from '@/ui/theme/tokens';

import type { Belly } from './belly';
import { confirmSwap } from './confirmSwap';
import type { PantryState } from './pantryStore';
import { pantryStore } from './services';

const JAR = 72;
const JAR_IMAGES = {
  full: require('@/assets/pantry/jar.png'),
  empty: require('@/assets/pantry/jar-empty.png'),
};

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });

export function PantrySection({ belly, pantry }: { belly: Belly; pantry: PantryState }) {
  const { t } = useI18n();
  const swapping = pantry.writing === 'swap';
  const failure = pantry.failure?.write === 'swap' ? pantry.failure.reason : null;
  const footer = [
    belly.coins > 0 ? t('ask.pantry.coins', { count: belly.coins }) : t('ask.pantry.noCoins'),
    failure ? t(`ask.pantryFailure.${failure}`) : t('ask.pantry.footer'),
  ].join('\n');

  const swap = async () => {
    pantryStore.dismissFailure();
    const yes = await confirmSwap({
      title: t('ask.pantry.swapTitle'),
      message: t('ask.pantry.swapMessage', { count: Math.max(0, belly.coins - 1) }),
      confirm: t('ask.hungry.swapConfirm'),
      cancel: t('ask.hungry.cancel'),
    });
    if (yes) await pantryStore.swap();
  };

  return (
    <Section
      title={t('ask.pantry.title')}
      footer={<Text modifiers={[accessibilityIdentifier('tapir-pantry-footer')]}>{footer}</Text>}
    >
      <HStack
        spacing={vars['--space-4']}
        modifiers={[accessibilityElement('combine'), accessibilityIdentifier('tapir-pantry-jar')]}
      >
        <RNHostView matchContents>
          <Image
            source={belly.leaves > 0 ? JAR_IMAGES.full : JAR_IMAGES.empty}
            style={{ width: JAR, height: JAR }}
            contentFit="contain"
            accessible={false}
          />
        </RNHostView>
        <VStack alignment="leading" spacing={vars['--space-1']}>
          <Text
            modifiers={[
              font({ textStyle: 'title3', weight: 'semibold' }),
              accessibilityIdentifier('tapir-pantry-count'),
            ]}
          >
            {t('ask.pantry.count', { count: belly.leaves })}
          </Text>
          <Text modifiers={[secondary]}>{t('ask.pantry.never')}</Text>
        </VStack>
        <Spacer />
      </HStack>
      {swapping ? (
        <HStack
          modifiers={[
            frame({ minHeight: vars['--touch-min'] }),
            accessibilityElement('combine'),
            accessibilityIdentifier('tapir-pantry-swapping'),
          ]}
        >
          <Text>{t('ask.pantry.swapping')}</Text>
          <Spacer />
          <ProgressView modifiers={[accessibilityLabel(t('ask.pantry.swapping'))]} />
        </HStack>
      ) : (
        <Button
          label={t('ask.pantry.swap')}
          onPress={() => void swap()}
          modifiers={[
            disabled(belly.coins < 1 || pantry.writing !== null),
            frame({ minHeight: vars['--touch-min'] }),
            accessibilityIdentifier('tapir-pantry-swap'),
          ]}
        />
      )}
    </Section>
  );
}

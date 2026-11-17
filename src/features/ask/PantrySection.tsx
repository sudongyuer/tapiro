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
  buttonBorderShape,
  buttonStyle,
  controlSize,
  disabled,
  font,
  foregroundStyle,
  frame,
} from '@expo/ui/swift-ui/modifiers';
import { Image } from 'expo-image';

import { useI18n } from '@/lib/i18n';
import { NoticeCard } from '@/ui/NoticeCard';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

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
const WIDE = frame({ maxWidth: Infinity });

export function PantrySection({ belly, pantry }: { belly: Belly; pantry: PantryState }) {
  const { t } = useI18n();
  const swapping = pantry.writing === 'swap';
  const failure = pantry.failure?.write === 'swap' ? pantry.failure.reason : null;
  const footer = [
    belly.coins > 0 ? t('ask.pantry.coins', { count: belly.coins }) : t('ask.pantry.noCoins'),
    t('ask.pantry.footer'),
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
    <>
      {failure ? (
        <NoticeCard
          tone="urgent"
          icon="exclamationmark.circle.fill"
          title={t(`ask.pantryFailure.${failure}`)}
          testID="tapir-pantry-swap-failed"
        />
      ) : null}
      <PantryJar
        belly={belly}
        swapping={swapping}
        footer={footer}
        onSwap={() => void swap()}
        busy={pantry.writing !== null}
      />
    </>
  );
}

function PantryJar({
  belly,
  swapping,
  busy,
  footer,
  onSwap,
}: {
  belly: Belly;
  swapping: boolean;
  busy: boolean;
  footer: string;
  onSwap: () => void;
}) {
  const { t } = useI18n();
  const onInk = useTheme().color('--color-on-accent');
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
          onPress={onSwap}
          modifiers={[
            buttonStyle('borderedProminent'),
            buttonBorderShape('capsule'),
            controlSize('large'),
            disabled(belly.coins < 1 || busy),
            accessibilityIdentifier('tapir-pantry-swap'),
          ]}
        >
          <Text modifiers={[WIDE, font({ weight: 'semibold' }), foregroundStyle(onInk)]}>
            {t('ask.pantry.swap')}
          </Text>
        </Button>
      )}
    </Section>
  );
}

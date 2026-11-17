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
} from '@expo/ui/swift-ui/modifiers';
import { Image } from 'expo-image';
import { useState, type ComponentProps } from 'react';

import { useI18n } from '@/lib/i18n';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { NoticeCard } from '@/ui/NoticeCard';
import { vars } from '@/ui/theme/tokens';

import type { Belly } from './belly';
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
    t('ask.pantry.footer'),
  ].join('\n');

  const [asking, setAsking] = useState(false);
  const swapCopy = {
    title: t('ask.pantry.swapTitle'),
    message: t('ask.pantry.swapMessage', { count: Math.max(0, belly.coins - 1) }),
    confirm: t('ask.hungry.swapConfirm'),
    keep: t('ask.hungry.cancel'),
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
        swapDialog={{
          copy: swapCopy,
          presented: asking,
          onPresentedChange: (presented) => {
            if (presented) pantryStore.dismissFailure();
            setAsking(presented);
          },
          onConfirm: () => void pantryStore.swap(),
        }}
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
  swapDialog,
}: {
  belly: Belly;
  swapping: boolean;
  busy: boolean;
  footer: string;
  swapDialog: Omit<ComponentProps<typeof ConfirmDialog>, 'destructive' | 'children'>;
}) {
  const { t } = useI18n();
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
        <ConfirmDialog {...swapDialog} destructive={false}>
          <Button
            label={t('ask.pantry.swap')}
            onPress={() => swapDialog.onPresentedChange(true)}
            modifiers={[
              disabled(belly.coins < 1 || busy),
              accessibilityIdentifier('tapir-pantry-swap'),
            ]}
          />
        </ConfirmDialog>
      )}
    </Section>
  );
}

import {
  Button,
  HStack,
  Image,
  ProgressView,
  RNHostView,
  Section,
  Spacer,
  Text,
  VStack,
} from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityHidden,
  accessibilityIdentifier,
  contentShape,
  accessibilityLabel,
  fixedSize,
  font,
  foregroundStyle,
  frame,
  listRowBackground,
  tint,
  shapes,
} from '@expo/ui/swift-ui/modifiers';
import { PlatformColor } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { Mascot } from '@/ui/Mascot';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';
import { useSelectedUntilReturn } from '@/ui/useSelectedUntilReturn';

import { accessoryLevel } from '../model';
import { ACCESSORIES, type PublicMascot } from '../types';
import { levelLabel, levelProgress } from './profileView';

const ROW_HEAD = 28;
const CARD_HEAD = 72;
const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
const tertiary = foregroundStyle({ type: 'hierarchical', style: 'tertiary' });
const wraps = fixedSize({ horizontal: false, vertical: true });
const fill = frame({ maxWidth: Infinity, alignment: 'leading' });

export function MascotRow({ mascot }: { mascot: PublicMascot }) {
  const { t } = useI18n();
  const line = `${levelLabel(mascot.level, t)} · ${t('reputation.level.stickers', { count: mascot.stickers })}`;
  return (
    <Section>
      <HStack
        spacing={vars['--space-3']}
        modifiers={[
          accessibilityElement('ignore'),
          accessibilityLabel(line),
          accessibilityIdentifier('profile-mascot'),
          frame({ minHeight: vars['--touch-min'] }),
        ]}
      >
        <RNHostView matchContents>
          <Mascot variant="side" size={ROW_HEAD} />
        </RNHostView>
        <Text modifiers={[wraps, fill]}>{line}</Text>
      </HStack>
    </Section>
  );
}

export function LevelCard({ mascot }: { mascot: PublicMascot }) {
  const { t } = useI18n();
  const { color } = useTheme();
  const progress = levelProgress(mascot.level, mascot.stickers);
  const next = t('reputation.profile.nextLevel', {
    count: progress.toGo,
    label: levelLabel(progress.next, t),
  });
  return (
    <Section
      title={t('reputation.profile.levelTitle')}
      footer={<Text>{t('reputation.profile.levelNote')}</Text>}
    >
      <HStack
        spacing={vars['--space-4']}
        modifiers={[
          accessibilityElement('combine'),
          accessibilityIdentifier('profile-level'),
          listRowBackground(color('--color-moment-bg')),
        ]}
      >
        <RNHostView matchContents>
          <Mascot variant="side" size={CARD_HEAD} outlined />
        </RNHostView>
        <VStack alignment="leading" spacing={vars['--space-2']} modifiers={[fill]}>
          <Text modifiers={[font({ textStyle: 'headline' }), wraps]}>
            {levelLabel(mascot.level, t)}
          </Text>
          <ProgressView
            value={progress.fraction}
            modifiers={[tint(color('--color-accent')), accessibilityHidden()]}
          />
          <Text modifiers={[font({ textStyle: 'footnote' }), secondary, wraps]}>{next}</Text>
        </VStack>
      </HStack>
      {ACCESSORIES.map((accessory) => {
        const level = accessoryLevel(accessory);
        const open = level <= mascot.level;
        const name = t(`reputation.accessory.${accessory}`);
        return (
          <HStack
            key={accessory}
            spacing={vars['--space-3']}
            modifiers={[
              accessibilityElement('ignore'),
              accessibilityLabel(
                open
                  ? t('reputation.profile.accessoryUnlockedA11y', { name })
                  : t('reputation.profile.accessoryLockedA11y', { name, level }),
              ),
              accessibilityIdentifier(`profile-accessory-${accessory}`),
            ]}
          >
            <Image
              systemName={open ? 'checkmark.circle.fill' : 'lock.fill'}
              size={17}
              modifiers={[open ? foregroundStyle(color('--color-success')) : tertiary]}
            />
            <Text modifiers={open ? [fill] : [fill, secondary]}>{name}</Text>
            {open ? null : (
              <Text modifiers={[secondary, font({ textStyle: 'footnote' })]}>
                {t('reputation.profile.accessoryLocked', { level })}
              </Text>
            )}
          </HStack>
        );
      })}
    </Section>
  );
}

export function StickerBookRow({ count, onPress }: { count: number; onPress: () => void }) {
  const { t } = useI18n();
  const { selected, select } = useSelectedUntilReturn();
  return (
    <Section>
      <Button
        onPress={() => {
          select();
          onPress();
        }}
        testID="profile-stickers"
        modifiers={selected ? [listRowBackground(PlatformColor('systemGray4'))] : []}
      >
        <HStack spacing={vars['--space-2']} modifiers={[contentShape(shapes.rectangle())]}>
          <Text modifiers={[foregroundStyle({ type: 'hierarchical', style: 'primary' })]}>
            {t('stickers.book.title')}
          </Text>
          <Spacer />
          <Text modifiers={[secondary]}>{t('stickers.count', { count })}</Text>
          <Image
            systemName="chevron.right"
            size={14}
            modifiers={[tertiary, accessibilityHidden()]}
          />
        </HStack>
      </Button>
    </Section>
  );
}

import { HStack, Image, ProgressView, RNHostView, Section, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityIdentifier,
  accessibilityLabel,
  fixedSize,
  font,
  foregroundStyle,
  frame,
  listRowBackground,
  multilineTextAlignment,
} from '@expo/ui/swift-ui/modifiers';
import type { SFSymbol } from 'sf-symbols-typescript';

import { useI18n } from '@/lib/i18n';
import { Avatar } from '@/ui/Avatar';
import { TierMark } from '@/ui/TierMark';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { AppliedSticker } from '../shared/appliedStamp';
import type { DetailCopy } from './detailCopy';
import type { DetailView } from './detailState';

const STICKER = 48;
const AVATAR = 28;
const ICON = 18;
const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
const wraps = fixedSize({ horizontal: false, vertical: true });
const footnote = font({ textStyle: 'footnote' });
const fill = frame({ maxWidth: Infinity, alignment: 'leading' });

export function DetailHeader({ view, copy }: { view: DetailView; copy: DetailCopy }) {
  return (
    <Section modifiers={[listRowBackground('clear')]}>
      <VStack spacing={vars['--space-2']} modifiers={[frame({ maxWidth: Infinity })]}>
        <RNHostView matchContents>
          <AppliedSticker
            id={view.id}
            surface="detail"
            art={view}
            size={STICKER}
            applied={view.action === 'applied'}
            testID="bounty-detail"
          />
        </RNHostView>
        <Text
          modifiers={[
            font({ textStyle: 'title3', weight: 'semibold' }),
            multilineTextAlignment('center'),
            wraps,
            accessibilityIdentifier('bounty-detail-title'),
          ]}
        >
          {view.title}
        </Text>
        <VStack spacing={vars['--space-1']}>
          <Text
            modifiers={[
              font({ size: vars['--text-reward'], weight: 'heavy', design: 'rounded' }),
              accessibilityLabel(copy.rewardLabel),
              accessibilityIdentifier('bounty-detail-reward'),
            ]}
          >
            {copy.reward}
          </Text>
          {copy.reference ? (
            <Text
              modifiers={[footnote, secondary, accessibilityIdentifier('bounty-detail-reference')]}
            >
              {copy.reference}
            </Text>
          ) : null}
        </VStack>
      </VStack>
    </Section>
  );
}

function InfoRow({
  icon,
  urgent,
  title,
  detail,
  testID,
}: {
  icon: SFSymbol;
  urgent?: string;
  title: string;
  detail: string | null;
  testID: string;
}) {
  const ink = urgent ? foregroundStyle(urgent) : secondary;
  return (
    <HStack
      alignment="top"
      spacing={vars['--space-3']}
      modifiers={[accessibilityElement('combine'), accessibilityIdentifier(testID)]}
    >
      <Image systemName={icon} size={ICON} modifiers={[ink, frame({ width: ICON + 6 })]} />
      <VStack alignment="leading" spacing={2} modifiers={[fill]}>
        <Text modifiers={[wraps]}>{title}</Text>
        {detail ? (
          <HStack spacing={vars['--space-1']} alignment="firstTextBaseline">
            {urgent ? (
              <Image systemName="clock.badge.exclamationmark" modifiers={[footnote, ink]} />
            ) : null}
            <Text
              modifiers={[
                font({ textStyle: 'footnote', weight: urgent ? 'semibold' : 'regular' }),
                ink,
                wraps,
              ]}
            >
              {detail}
            </Text>
          </HStack>
        ) : null}
      </VStack>
    </HStack>
  );
}

export function DetailInfo({ view, copy }: { view: DetailView; copy: DetailCopy }) {
  const { color } = useTheme();
  const urgent = copy.urgent ? color('--color-urgent') : undefined;
  return (
    <Section>
      {view.placeLabel !== null ? (
        <InfoRow
          icon="mappin.and.ellipse"
          title={view.placeLabel}
          detail={copy.placeHint}
          testID="bounty-detail-place"
        />
      ) : null}
      {copy.time ? (
        <InfoRow
          icon="clock"
          urgent={urgent}
          title={copy.time}
          detail={copy.urgent}
          testID="bounty-detail-time"
        />
      ) : null}
      <HStack
        spacing={vars['--space-3']}
        modifiers={[
          accessibilityElement('combine'),
          accessibilityIdentifier('bounty-detail-poster'),
        ]}
      >
        <RNHostView matchContents>
          <Avatar uri={null} size={AVATAR} label={copy.name} initial={copy.initial} />
        </RNHostView>
        <VStack alignment="leading" spacing={2} modifiers={[fill]}>
          <Text modifiers={[wraps]}>{copy.name}</Text>
          <TierMark label={copy.tier} rank={copy.rank} />
        </VStack>
      </HStack>
    </Section>
  );
}

export function DetailDescription({ text }: { text: string | null | undefined }) {
  const { t } = useI18n();
  if (text === null) return null;
  return (
    <Section title={t('bounty.detail.description')}>
      {text === undefined ? (
        <ProgressView
          modifiers={[
            accessibilityLabel(t('bounty.detail.loading')),
            accessibilityIdentifier('bounty-detail-loading'),
          ]}
        />
      ) : (
        <Text modifiers={[wraps, accessibilityIdentifier('bounty-detail-description')]}>
          {text}
        </Text>
      )}
    </Section>
  );
}

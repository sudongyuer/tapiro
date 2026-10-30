import { Button, HStack, Image, RNHostView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityIdentifier,
  background,
  buttonStyle,
  fixedSize,
  font,
  foregroundStyle,
  frame,
  layoutPriority,
  lineLimit,
  padding,
  shapes,
  truncationMode,
} from '@expo/ui/swift-ui/modifiers';

import { useI18n } from '@/lib/i18n';
import { Avatar } from '@/ui/Avatar';
import { TierMark } from '@/ui/TierMark';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { AppliedSticker } from '../shared/appliedStamp';
import type { CardCopy } from './cardCopy';
import type { BoardRow } from './types';

const STICKER = 48;
const AVATAR = 24;
const NAME_MIN = 40;
const GAP = ' ';
const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
const footnote = font({ textStyle: 'footnote' });

type Part = { copy: CardCopy; testID: string };

export function CardHead({ row, copy, testID }: Part & { row: BoardRow }) {
  return (
    <HStack spacing={vars['--space-3']}>
      <RNHostView matchContents>
        <AppliedSticker
          id={row.id}
          surface="card"
          art={row}
          size={STICKER}
          applied={row.appliedByMe}
          testID={testID}
        />
      </RNHostView>
      <VStack
        alignment="leading"
        spacing={2}
        modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}
      >
        <Text modifiers={[footnote, secondary, lineLimit(1)]}>{copy.category}</Text>
        <Text
          modifiers={[
            font({ textStyle: 'headline' }),
            lineLimit(2),
            fixedSize({ horizontal: false, vertical: true }),
            accessibilityIdentifier(`${testID}-title`),
          ]}
        >
          {row.title}
        </Text>
      </VStack>
      <Text
        modifiers={[
          font({ size: vars['--text-reward'], weight: 'heavy', design: 'rounded' }),
          fixedSize(),
          layoutPriority(1),
          accessibilityIdentifier(`${testID}-reward`),
        ]}
      >
        {copy.reward}
      </Text>
    </HStack>
  );
}

export function CardWhenWhere({ urgent, copy, testID }: Part & { urgent: boolean }) {
  const { color } = useTheme();
  const urgentInk = foregroundStyle(color('--color-urgent'));
  return (
    <HStack
      spacing={vars['--space-1']}
      alignment="firstTextBaseline"
      modifiers={[accessibilityIdentifier(`${testID}-meta`)]}
    >
      {urgent ? (
        <Image
          systemName="clock.badge.exclamationmark"
          modifiers={[footnote, urgentInk, accessibilityIdentifier(`${testID}-urgent`)]}
        />
      ) : null}
      <Text modifiers={[footnote, secondary, lineLimit(3), truncationMode('middle')]}>
        {copy.when ? (
          <Text
            modifiers={
              urgent ? [urgentInk, font({ textStyle: 'footnote', weight: 'semibold' })] : []
            }
          >
            {copy.when}
          </Text>
        ) : null}
        <Text>{copy.when ? `${GAP}${copy.place}` : copy.place}</Text>
      </Text>
    </HStack>
  );
}

export function CardFoot({
  applied,
  copy,
  testID,
  onApply,
}: Part & { applied: boolean; onApply: () => void }) {
  const { t } = useI18n();
  const { color } = useTheme();
  return (
    <HStack spacing={vars['--space-2']} modifiers={[accessibilityIdentifier(`${testID}-poster`)]}>
      <RNHostView matchContents>
        <Avatar uri={null} size={AVATAR} label={copy.name} initial={copy.initial} />
      </RNHostView>
      <Text
        modifiers={[
          footnote,
          secondary,
          lineLimit(1),
          frame({ minWidth: NAME_MIN, alignment: 'leading' }),
        ]}
      >
        {t('bounty.board.card.posterName', { name: copy.name })}
      </Text>
      <TierMark label={copy.tier} rank={copy.rank} modifiers={[layoutPriority(0.5)]} />
      <Spacer minLength={vars['--space-2']} />
      {applied ? null : (
        <Button
          onPress={onApply}
          modifiers={[
            buttonStyle('plain'),
            fixedSize(),
            layoutPriority(1),
            accessibilityIdentifier(`${testID}-apply`),
          ]}
        >
          <Text
            modifiers={[
              font({ textStyle: 'subheadline', weight: 'semibold' }),
              foregroundStyle(color('--color-on-accent')),
              padding({ horizontal: vars['--space-5'] }),
              frame({ minHeight: vars['--touch-min'] }),
              background(color('--color-accent'), shapes.capsule()),
            ]}
          >
            {t('bounty.board.apply')}
          </Text>
        </Button>
      )}
    </HStack>
  );
}

// Own row, not beside the poster: in ms the status and a long tier name left no room for the name.
export function CardApplied({ testID }: { testID: string }) {
  const { t } = useI18n();
  return (
    <HStack
      spacing={vars['--space-1']}
      alignment="firstTextBaseline"
      modifiers={[accessibilityIdentifier(`${testID}-applied`)]}
    >
      <Image systemName="circle.inset.filled" modifiers={[footnote]} />
      <Text
        modifiers={[
          font({ textStyle: 'footnote', weight: 'semibold' }),
          fixedSize({ horizontal: false, vertical: true }),
        ]}
      >
        {t('bounty.board.applied')}
      </Text>
    </HStack>
  );
}

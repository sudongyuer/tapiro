import { Button, HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityIdentifier,
  accessibilityLabel,
  background,
  buttonStyle,
  contentShape,
  fixedSize,
  font,
  foregroundStyle,
  frame,
  padding,
  shapes,
  type ModifierConfig,
} from '@expo/ui/swift-ui/modifiers';

import { PlatformColor } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import type { ProfileReview } from '../types';
import { chipLabels, faceTone, reviewLabel, reviewSource } from './profileView';

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
const wraps = fixedSize({ horizontal: false, vertical: true });
const fill = frame({ maxWidth: Infinity, alignment: 'leading' });

export function ReviewRow({
  review,
  owner,
  self,
  onReply,
  modifiers = [],
}: {
  review: ProfileReview;
  owner: string;
  self: boolean;
  onReply: ((reviewId: string) => void) | null;
  modifiers?: ModifierConfig[];
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const tone = faceTone(review.face);
  const chips = chipLabels(review, t);
  const source = reviewSource(review, t);
  const testID = `profile-review-${review.id}`;
  return (
    <VStack alignment="leading" spacing={vars['--space-2']} modifiers={[fill, ...modifiers]}>
      <VStack
        alignment="leading"
        spacing={vars['--space-1']}
        modifiers={[
          fill,
          accessibilityElement('ignore'),
          accessibilityLabel(reviewLabel(review, owner, self, t)),
          accessibilityIdentifier(testID),
        ]}
      >
        <HStack spacing={vars['--space-2']} alignment="firstTextBaseline">
          <Text
            modifiers={[
              font({ textStyle: 'subheadline', weight: 'bold' }),
              tone ? foregroundStyle(color(tone)) : secondary,
            ]}
          >
            {t(`reputation.face.${review.face}`)}
          </Text>
          {chips.length > 0 ? (
            <Text modifiers={[font({ textStyle: 'subheadline' }), wraps]}>{chips.join(' · ')}</Text>
          ) : null}
          <Spacer />
        </HStack>
        {review.sentence ? <Text modifiers={[wraps]}>{review.sentence}</Text> : null}
        {source ? (
          <Text modifiers={[font({ textStyle: 'footnote' }), secondary, wraps]}>{source}</Text>
        ) : null}
        {review.reply ? (
          <Text
            modifiers={[
              font({ textStyle: 'subheadline' }),
              wraps,
              fill,
              padding({ horizontal: vars['--space-3'], vertical: vars['--space-2'] }),
              background(
                PlatformColor('tertiarySystemFill'),
                shapes.roundedRectangle({ cornerRadius: vars['--radius-chip'] }),
              ),
              accessibilityIdentifier(`${testID}-reply`),
            ]}
          >
            {`${self ? t('reputation.reply.mine') : t('reputation.reply.theirs', { name: owner })}${review.reply.body}`}
          </Text>
        ) : null}
      </VStack>
      {onReply && review.reply === null ? (
        <Button
          onPress={() => onReply(review.id)}
          testID={`${testID}-reply-button`}
          modifiers={[buttonStyle('borderless'), accessibilityLabel(t('reputation.reply.action'))]}
        >
          <Text
            modifiers={[
              font({ textStyle: 'subheadline', weight: 'semibold' }),
              foregroundStyle(color('--color-accent')),
              frame({
                minWidth: vars['--touch-min'],
                minHeight: vars['--touch-min'],
                alignment: 'leading',
              }),
              contentShape(shapes.rectangle()),
            ]}
          >
            {t('reputation.reply.action')}
          </Text>
        </Button>
      ) : null}
    </VStack>
  );
}

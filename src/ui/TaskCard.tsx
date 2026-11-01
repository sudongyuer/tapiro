import { HStack, RNHostView, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityAddTraits,
  accessibilityElement,
  accessibilityIdentifier,
  accessibilityLabel,
  fixedSize,
  font,
  frame,
  foregroundStyle,
  layoutPriority,
  lineLimit,
  onTapGesture,
} from '@expo/ui/swift-ui/modifiers';

import type { HandArtId } from '@/lib/handArt';

import { HandArt } from './HandArt';
import { vars } from './theme/tokens';

const TASK_CARD_ART = 44;
const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
const tertiary = foregroundStyle({ type: 'hierarchical', style: 'tertiary' });

// SwiftUI layout, not RN: an RN row inside RNHostView in a Form row was measured at its unwrapped width, so a
// long title pushed the reward out of the card.
export function TaskCard({
  art,
  title,
  meta,
  reward,
  rewardLabel,
  titleLines = 2,
  kicker,
  placeholder = { title: false, reward: false },
  artPress,
  testID,
}: {
  art: HandArtId;
  title: string;
  meta: string | null;
  reward: string;
  rewardLabel: string;
  titleLines?: number;
  kicker?: string | null;
  placeholder?: { title: boolean; reward: boolean };
  artPress?: { label: string; onPress: () => void };
  testID: string;
}) {
  const artModifiers = artPress
    ? [
        onTapGesture(artPress.onPress),
        accessibilityLabel(artPress.label),
        accessibilityAddTraits(['isButton']),
        accessibilityIdentifier(`${testID}-art`),
      ]
    : [];
  return (
    <HStack spacing={vars['--space-3']}>
      <HStack modifiers={artModifiers}>
        <RNHostView matchContents>
          <HandArt id={art} size={TASK_CARD_ART} />
        </RNHostView>
      </HStack>
      <VStack
        alignment="leading"
        spacing={vars['--space-1']}
        modifiers={[
          frame({ maxWidth: Infinity, alignment: 'leading' }),
          accessibilityElement('combine'),
          accessibilityIdentifier(`${testID}-text`),
        ]}
      >
        {kicker ? (
          <Text
            modifiers={[
              font({ textStyle: 'footnote' }),
              secondary,
              lineLimit(1),
              accessibilityIdentifier(`${testID}-kicker`),
            ]}
          >
            {kicker}
          </Text>
        ) : null}
        <Text
          modifiers={[
            font({ textStyle: 'title3', weight: 'semibold' }),
            ...(placeholder.title ? [tertiary] : []),
            lineLimit(titleLines),
            accessibilityIdentifier(`${testID}-title`),
          ]}
        >
          {title}
        </Text>
        {meta ? (
          <Text modifiers={[font({ textStyle: 'footnote' }), secondary, lineLimit(1)]}>{meta}</Text>
        ) : null}
      </VStack>
      <Text
        modifiers={[
          font({ size: vars['--text-reward'], weight: 'heavy', design: 'rounded' }),
          ...(placeholder.reward ? [tertiary] : []),
          fixedSize(),
          layoutPriority(1),
          accessibilityLabel(rewardLabel),
          accessibilityIdentifier(`${testID}-reward`),
        ]}
      >
        {reward}
      </Text>
    </HStack>
  );
}

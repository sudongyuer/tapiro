import { HStack, RNHostView, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityIdentifier,
  accessibilityLabel,
  fixedSize,
  font,
  frame,
  foregroundStyle,
  layoutPriority,
  lineLimit,
} from '@expo/ui/swift-ui/modifiers';

import type { BountyCategory } from '@/lib/stickers';

import { CategorySticker } from './CategorySticker';
import { vars } from './theme/tokens';

const STICKER = 44;
const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });

// SwiftUI layout, not RN: an RN row inside RNHostView in a Form row was measured at its unwrapped width, so a
// long title pushed the reward out of the card.
export function TaskCard({
  category,
  title,
  meta,
  reward,
  rewardLabel,
  titleLines = 2,
  testID,
}: {
  category: BountyCategory;
  title: string;
  meta: string | null;
  reward: string;
  rewardLabel: string;
  titleLines?: number;
  testID: string;
}) {
  return (
    <HStack spacing={vars['--space-3']}>
      <RNHostView matchContents>
        <CategorySticker category={category} size={STICKER} />
      </RNHostView>
      <VStack
        alignment="leading"
        spacing={vars['--space-1']}
        modifiers={[
          frame({ maxWidth: Infinity, alignment: 'leading' }),
          accessibilityElement('combine'),
          accessibilityIdentifier(`${testID}-text`),
        ]}
      >
        <Text
          modifiers={[
            font({ textStyle: 'title3', weight: 'semibold' }),
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

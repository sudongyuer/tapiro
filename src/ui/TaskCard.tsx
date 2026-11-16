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
import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import type { HandArtId } from '@/lib/handArt';

import { HandArt } from './HandArt';
import { vars } from './theme/tokens';
import { useTheme } from './theme/useTheme';

const TASK_CARD_ART = 56;
const SWAP_BADGE = 22;
const SWAP_GLYPH = 12;
const SWAP_OVERHANG = vars['--space-1'];
const footnote = font({ textStyle: 'footnote' });
const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
const tertiary = foregroundStyle({ type: 'hierarchical', style: 'tertiary' });

// SwiftUI layout, not RN: an RN row inside RNHostView in a Form row was measured at its unwrapped width, so a
// long title pushed the reward out of the card.
export function TaskCard({
  art,
  title,
  meta,
  time = null,
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
  time?: string | null;
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
      <HStack spacing={0} modifiers={artModifiers}>
        <RNHostView matchContents>
          {artPress ? <SwapArt art={art} /> : <HandArt id={art} size={TASK_CARD_ART} />}
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
              footnote,
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
        {meta || time ? (
          <HStack spacing={vars['--space-1']} alignment="firstTextBaseline">
            {meta ? <Text modifiers={[footnote, secondary, lineLimit(1)]}>{meta}</Text> : null}
            {time ? (
              <Text
                modifiers={[
                  footnote,
                  secondary,
                  lineLimit(2),
                  fixedSize({ horizontal: false, vertical: true }),
                  layoutPriority(1),
                  accessibilityIdentifier(`${testID}-time`),
                ]}
              >
                {time}
              </Text>
            ) : null}
          </HStack>
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

function SwapArt({ art }: { art: HandArtId }) {
  const { color } = useTheme();
  return (
    <View style={styles.swap}>
      <HandArt id={art} size={TASK_CARD_ART} />
      <View style={[styles.badge, { backgroundColor: color('--color-accent') }]}>
        <SymbolView
          name="arrow.triangle.2.circlepath"
          size={SWAP_GLYPH}
          weight="bold"
          tintColor={color('--color-on-accent')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  swap: { width: TASK_CARD_ART + SWAP_OVERHANG, height: TASK_CARD_ART + SWAP_OVERHANG },
  badge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: SWAP_BADGE,
    height: SWAP_BADGE,
    borderRadius: SWAP_BADGE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

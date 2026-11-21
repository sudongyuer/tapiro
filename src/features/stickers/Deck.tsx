import * as Haptics from 'expo-haptics';
import { useState, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import {
  GestureDetector,
  GestureHandlerRootView,
  usePanGesture,
} from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useI18n } from '@/lib/i18n';
import type { Sticker } from '@/lib/stickers';
import { FADE_IN, useMotionReduced } from '@/ui/theme/motion';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { cardPose, cardWindow, dragPosition, releaseTurn } from './deckMotion';
import { CARD_HEIGHT, cardSurface, DoneCard, useCardLabel } from './DoneCard';

const CARD_MAX = 320;
const GUTTER = vars['--space-7'] * 2;
const DECK_HEIGHT = CARD_HEIGHT + vars['--space-6'];
const RELEASE = { duration: vars['--duration-settle'], dampingRatio: 0.8 };
const FLY = { duration: vars['--duration-settle'], dampingRatio: 1, overshootClamping: true };
const ACTIVATE = 12;
const VERTICAL_FAIL = 16;
const BEHIND = [
  { rotate: '-5deg', translateX: -8, translateY: 10 },
  { rotate: '4deg', translateX: 7, translateY: 18 },
];

type Props = {
  stickers: Sticker[];
  start: number;
  onTurn: (index: number) => void;
  onJump: (index: number) => void;
};

export function Deck(props: Props) {
  return (
    <GestureHandlerRootView style={styles.root}>
      {useMotionReduced() ? <FadingDeck {...props} /> : <MovingDeck {...props} />}
    </GestureHandlerRootView>
  );
}

const selection = () => void Haptics.selectionAsync();

function MovingDeck({ stickers, start, onTurn, onJump }: Props) {
  const { width: screen } = useWindowDimensions();
  const cardWidth = Math.min(screen - GUTTER, CARD_MAX);
  const count = stickers.length;
  const [index, setIndex] = useState(start);
  const position = useSharedValue(start);
  const base = useSharedValue(start);
  const settle = (next: number) => {
    setIndex(next);
    onTurn(next);
  };

  const pan = usePanGesture({
    activeOffsetX: [-ACTIVATE, ACTIVATE],
    failOffsetY: [-VERTICAL_FAIL, VERTICAL_FAIL],
    enabled: count > 1,
    onActivate: () => {
      'worklet';
      cancelAnimation(position);
      const at = Math.round(position.get());
      position.set(at);
      if (at !== base.get()) {
        base.set(at);
        scheduleOnRN(settle, at);
      }
    },
    onUpdate: (event) => {
      'worklet';
      position.set(dragPosition(base.get(), event.translationX, screen, count));
    },
    onDeactivate: (event) => {
      'worklet';
      const from = base.get();
      const turn = releaseTurn(event.translationX, event.velocityX, screen, count, from);
      const velocity = -event.velocityX / screen;
      if (turn === 0) {
        position.set(withSpring(from, { ...RELEASE, velocity }));
        return;
      }
      const target = from + turn;
      scheduleOnRN(selection);
      position.set(
        withSpring(target, { ...FLY, velocity }, (finished) => {
          if (!finished) return;
          base.set(target);
          scheduleOnRN(settle, target);
        }),
      );
    },
  });

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.deck} testID="sticker-stack">
        {cardWindow(index, count).map((card) => (
          <MovingCard
            key={stickers[card].id}
            sticker={stickers[card]}
            card={card}
            top={card === index}
            total={count}
            position={position}
            base={base}
            screen={screen}
            cardWidth={cardWidth}
            onJump={onJump}
          />
        ))}
      </View>
    </GestureDetector>
  );
}

function MovingCard({
  sticker,
  card,
  top,
  total,
  position,
  base,
  screen,
  cardWidth,
  onJump,
}: {
  sticker: Sticker;
  card: number;
  top: boolean;
  total: number;
  position: SharedValue<number>;
  base: SharedValue<number>;
  screen: number;
  cardWidth: number;
  onJump: (index: number) => void;
}) {
  const pose = useAnimatedStyle(() => {
    const now = cardPose(card, position.get(), base.get(), screen);
    return {
      opacity: now.opacity,
      zIndex: now.zIndex,
      transform: [
        { translateX: now.translateX },
        { translateY: now.translateY },
        { rotate: `${now.rotate}deg` },
        { scale: now.scale },
      ],
    };
  });
  return (
    <Animated.View
      style={[styles.slot, { left: (screen - cardWidth) / 2 }, pose]}
      accessibilityElementsHidden={!top}
      importantForAccessibility={top ? 'auto' : 'no-hide-descendants'}
    >
      {top ? (
        <AdjustableCard sticker={sticker} card={card} total={total} onJump={onJump}>
          <DoneCard sticker={sticker} width={cardWidth} />
        </AdjustableCard>
      ) : (
        <DoneCard sticker={sticker} width={cardWidth} />
      )}
    </Animated.View>
  );
}

function AdjustableCard({
  sticker,
  card,
  total,
  onJump,
  children,
}: {
  sticker: Sticker;
  card: number;
  total: number;
  onJump: (index: number) => void;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const label = useCardLabel(sticker);
  const step = (next: number) => {
    if (next < 0 || next >= total) return;
    selection();
    onJump(next);
  };
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: t('stickers.card.position', { index: card + 1, total }) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={({ nativeEvent }) =>
        step(nativeEvent.actionName === 'increment' ? card + 1 : card - 1)
      }
      testID={`sticker-card-${card}`}
    >
      {children}
    </View>
  );
}

function FadingDeck({ stickers, start, onTurn, onJump }: Props) {
  const { width: screen } = useWindowDimensions();
  const { color } = useTheme();
  const cardWidth = Math.min(screen - GUTTER, CARD_MAX);
  const count = stickers.length;
  const [index, setIndex] = useState(start);
  const turn = (next: number) => {
    selection();
    setIndex(next);
    onTurn(next);
  };
  const pan = usePanGesture({
    activeOffsetX: [-ACTIVATE, ACTIVATE],
    failOffsetY: [-VERTICAL_FAIL, VERTICAL_FAIL],
    enabled: count > 1,
    runOnJS: true,
    onDeactivate: (event) => {
      const step = releaseTurn(event.translationX, event.velocityX, screen, count, index);
      if (step !== 0) turn(index + step);
    },
  });
  const sticker = stickers[index];
  return (
    <GestureDetector gesture={pan}>
      <View style={styles.deck} testID="sticker-stack">
        {BEHIND.slice(0, count - 1)
          .reverse()
          .map((tilt) => (
            <View
              key={tilt.rotate}
              style={[
                styles.slot,
                styles.blank,
                cardSurface(color),
                {
                  left: (screen - cardWidth) / 2,
                  width: cardWidth,
                  transform: [
                    { translateX: tilt.translateX },
                    { translateY: tilt.translateY },
                    { rotate: tilt.rotate },
                  ],
                },
              ]}
            />
          ))}
        <Animated.View
          key={sticker.id}
          entering={FADE_IN}
          style={[styles.slot, { left: (screen - cardWidth) / 2 }]}
        >
          <AdjustableCard sticker={sticker} card={index} total={count} onJump={onJump}>
            <DoneCard sticker={sticker} width={cardWidth} />
          </AdjustableCard>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: { height: DECK_HEIGHT, alignSelf: 'stretch' },
  deck: { height: DECK_HEIGHT },
  slot: { position: 'absolute', top: vars['--space-2'] },
  blank: {
    height: CARD_HEIGHT,
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: vars['--sticker-shadow-blur'],
  },
});

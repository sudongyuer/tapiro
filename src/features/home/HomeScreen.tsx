import { useCallback, useState, type ReactElement, type ReactNode, type RefObject } from 'react';
import {
  PlatformColor,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type RefreshControlProps,
  type ScrollViewProps,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useReducedMotion,
  useScrollOffset,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/lib/i18n';
import { accessoryPriority } from '@/lib/liveItems';
import { useLiveItems } from '@/lib/useLiveItems';
import { MascotStage, STAGE_HEIGHT, STAGE_HILL_HEIGHT } from '@/ui/MascotStage';
import { vars } from '@/ui/theme/tokens';

import { liveCards, stageLine, stageState } from './homeModel';
import { HomeStrip, STRIP_ROW, STRIP_SHADOW } from './HomeStrip';
import { LiveCardStack, StackToggle, useCardHeights } from './LiveCardStack';
import { homeCardDetails } from './services';
import { followShift, stackHeight, stackLayout } from './stackLayout';
import { useStackProgress } from './useLiveStack';

const CARD_OVERLAP = STAGE_HILL_HEIGHT - 18;
const STRIP_FADE = 80;
const BUBBLE_FADE = 90;
const BUBBLE_TOP = 18;
const BEFORE_FIRST_SCROLL = -100000;
// useHeaderHeight reports the expanded large-title header; the strip hangs under the compact bar (54 pt on iOS 26).
const COMPACT_BAR = 54;
const HOME_TOP_CHROME = COMPACT_BAR + STRIP_ROW;
export const HOME_TOP_CLEAR = HOME_TOP_CHROME + STRIP_SHADOW;
export const HOME_BOTTOM_CHROME = 49;

export type HomeScreenProps = {
  scrollViewProps: ScrollViewProps & { ref: RefObject<ScrollView | null> };
  onLiveCardsLayout: (event: LayoutChangeEvent) => void;
  open: boolean;
  onToggle: (open: boolean) => void;
  name: string;
  onAsk: () => void;
  board?: ReactNode;
  refreshControl?: ReactElement<RefreshControlProps>;
};

export function HomeScreen({
  scrollViewProps,
  onLiveCardsLayout,
  open,
  onToggle,
  name,
  onAsk,
  board,
  refreshControl,
}: HomeScreenProps) {
  const { t } = useI18n();
  const headerHeight = useSafeAreaInsets().top + COMPACT_BAR;
  const reduceMotion = useReducedMotion();
  const { accessory, issues } = useLiveItems();
  const cards = liveCards(accessory, homeCardDetails, accessoryPriority, issues);
  const state = stageState(accessory, issues);
  const { key, ...values } = stageLine(cards);
  const line = t(`home.say.${key}`, values);
  const { heights, ready, onCardLayout } = useCardHeights(cards);
  const layout = stackLayout(heights);
  const progress = useStackProgress(open);
  const extra = layout.fannedHeight - layout.stackedHeight;

  const { ref, ...scrollProps } = scrollViewProps;
  const animatedRef = useAnimatedRef<ScrollView>();
  const offset = useScrollOffset(animatedRef, useSharedValue(BEFORE_FIRST_SCROLL));
  const stripBottom = headerHeight + STRIP_ROW;
  const [stripShown, setStripShown] = useState(false);

  useAnimatedReaction(
    () => STAGE_HEIGHT - offset.value < stripBottom + STRIP_FADE / 2,
    (shown, previous) => {
      if (shown !== previous) scheduleOnRN(setStripShown, shown);
    },
  );

  const stripStyle = useAnimatedStyle(() => {
    const stageBottom = STAGE_HEIGHT - offset.value;
    if (reduceMotion) return { opacity: stageBottom < stripBottom + STRIP_FADE / 2 ? 1 : 0 };
    const range = [stripBottom, stripBottom + STRIP_FADE];
    return {
      opacity: interpolate(stageBottom, range, [1, 0], Extrapolation.CLAMP),
      transform: [
        {
          translateY: interpolate(stageBottom, range, [0, -vars['--space-3']], Extrapolation.CLAMP),
        },
      ],
    };
  });

  const bubbleStyle = useAnimatedStyle(() => {
    if (reduceMotion) return {};
    const bubbleTop = BUBBLE_TOP - offset.value;
    const range = [headerHeight - BUBBLE_FADE / 4, headerHeight + BUBBLE_FADE * 0.75];
    return {
      opacity: interpolate(bubbleTop, range, [0, 1], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(bubbleTop, range, [0.86, 1], Extrapolation.CLAMP) }],
    };
  });

  const followStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: followShift(progress.value, extra, open) }],
  }));

  const attachScroll = useCallback(
    (node: ScrollView | null) => {
      ref.current = node;
      animatedRef(node);
    },
    [ref, animatedRef],
  );

  return (
    <>
      <ScrollView
        {...scrollProps}
        ref={attachScroll}
        testID="home-scroll"
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={refreshControl}
        style={styles.screen}
        contentContainerStyle={styles.content}
      >
        <MascotStage
          state={state}
          line={line}
          bubbleStyle={bubbleStyle}
          testID={`home-stage-${state}`}
        />
        <View
          testID="home-live-cards"
          onLayout={onLiveCardsLayout}
          style={[styles.stack, { height: stackHeight(layout, open) }]}
        >
          <LiveCardStack
            cards={cards}
            layout={layout}
            ready={ready}
            open={open}
            progress={progress}
            name={name}
            onAsk={onAsk}
            onToggle={onToggle}
            onCardLayout={onCardLayout}
          />
        </View>
        <Animated.View style={followStyle}>
          {cards.length > 1 ? (
            <StackToggle count={cards.length} open={open} onToggle={onToggle} />
          ) : null}
          {board}
        </Animated.View>
      </ScrollView>
      <HomeStrip
        state={state}
        line={line}
        label={t('home.strip.label', { title: t('shell.home.title'), line })}
        top={headerHeight}
        shown={stripShown}
        style={stripStyle}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PlatformColor('systemGroupedBackground') },
  content: { paddingHorizontal: vars['--space-4'], paddingBottom: vars['--space-7'] },
  stack: { marginTop: -CARD_OVERLAP },
});

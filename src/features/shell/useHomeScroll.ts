import { useEffect, useRef, useState } from 'react';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
} from 'react-native';
import { useHeaderHeight } from 'expo-router/react-navigation';

import { homeSignals } from './homeSignals';
import { createRestingOffset, liveCardsOnScreen } from './homeScroll';
import { useHomeReveal } from './hooks';

type ScrollEvent = NativeSyntheticEvent<NativeScrollEvent>;

export function useHomeScroll(onReveal?: () => void) {
  const headerHeight = useHeaderHeight();
  const header = useRef(headerHeight);
  const scroll = useRef<ScrollView>(null);
  const liveCardsBottom = useRef(0);
  const [resting] = useState(createRestingOffset);

  useEffect(() => {
    header.current = headerHeight;
  }, [headerHeight]);

  useEffect(() => () => homeSignals.setLiveCardsOnScreen(true), []);

  // Fabric reports the raw contentInset (0) rather than adjustedContentInset, and clamps scrollTo to it;
  // the offset where the first drag starts is the real top under the expanded large title.
  useHomeReveal(() => {
    const top = resting.get();
    if (top !== null) scroll.current?.scrollTo({ y: top, animated: true });
    onReveal?.();
  });

  return {
    scrollViewProps: {
      ref: scroll,
      scrollEventThrottle: 16,
      scrollToOverflowEnabled: true,
      onScrollBeginDrag: (event: ScrollEvent) =>
        resting.recordDragStart(event.nativeEvent.contentOffset.y),
      onScroll: (event: ScrollEvent) =>
        homeSignals.setLiveCardsOnScreen(
          liveCardsOnScreen({
            offsetY: event.nativeEvent.contentOffset.y,
            headerHeight: header.current,
            liveCardsBottom: liveCardsBottom.current,
          }),
        ),
    },
    onLiveCardsLayout: (event: LayoutChangeEvent) => {
      const { y, height } = event.nativeEvent.layout;
      liveCardsBottom.current = y + height;
    },
  };
}

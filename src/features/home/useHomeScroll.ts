import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
} from 'react-native';
import { useNavigation, type NativeStackNavigationProp } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';

import { homeSignals } from '@/lib/homeSignals';
import { useHomeReveal } from '@/lib/useHomeSignals';

import { createRestingOffset, createTopRequest, liveCardsOnScreen } from './homeScroll';

type ScrollEvent = NativeSyntheticEvent<NativeScrollEvent>;

export function useHomeScroll(onReveal?: () => void) {
  const headerHeight = useHeaderHeight();
  const header = useRef(headerHeight);
  const scroll = useRef<ScrollView>(null);
  const liveCardsBottom = useRef(0);
  const [resting] = useState(createRestingOffset);
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, object | undefined>>>();
  const [top] = useState(createTopRequest);

  useEffect(() => {
    header.current = headerHeight;
  }, [headerHeight]);

  useEffect(() => () => homeSignals.setLiveCardsOnScreen(true), []);

  // Fabric reports the raw contentInset (0) rather than adjustedContentInset, and clamps scrollTo to it;
  // the offset where the first drag starts is the real top under the expanded large title.
  const toTop = useCallback(() => {
    const top = resting.get();
    if (top !== null) scroll.current?.scrollTo({ y: top, animated: true });
  }, [resting]);
  useHomeReveal(
    () => {
      toTop();
      onReveal?.();
    },
    () => {
      if (top.request(navigation.isFocused())) toTop();
    },
  );

  // Scrolling while a pushed screen is still covering the board lands short of the top: the large title
  // expands on appear and shifts the content, so a request from a pushed screen waits for the board to appear.
  // A board that blurs before that transition ends (an interrupted return) drops the request.
  useEffect(() => {
    const offEnd = navigation.addListener('transitionEnd', (event) => {
      if (top.shown(event.data.closing)) toTop();
    });
    const offBlur = navigation.addListener('blur', top.left);
    return () => {
      offEnd();
      offBlur();
    };
  }, [navigation, toTop, top]);

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

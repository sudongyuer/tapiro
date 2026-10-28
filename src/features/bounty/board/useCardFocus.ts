import { useCallback, useEffect, useReducer, useRef, type RefObject } from 'react';
import {
  AccessibilityInfo,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
  type View,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { needsScroll, scrollTarget } from './axisFocus';
import { cardFocusReducer, NO_FOCUS } from './cardFocusState';

export type ScrollHost = {
  scroll: RefObject<ScrollView | null>;
  content: RefObject<View | null>;
  topInset: number;
  bottomInset: number;
};

type ScrollEvent = NativeSyntheticEvent<NativeScrollEvent>;

// Fabric's scrollTo returns without any scroll event when the target equals the current offset,
// so a scroll that has not moved by then is treated as settled.
const STILL_MS = 200;

export function useCardFocus({ scroll, content, topInset, bottomInset }: ScrollHost) {
  const cards = useRef(new Map<string, View>());
  const refs = useRef(new Map<string, (view: View | null) => void>());
  const offset = useRef<number | null>(null);
  const contentHeight = useRef(0);
  const still = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const [state, dispatch] = useReducer(cardFocusReducer, NO_FOCUS);
  const { ring } = state;

  useEffect(() => {
    const card = ring ? cards.current.get(ring.id) : undefined;
    if (card) AccessibilityInfo.sendAccessibilityEvent(card, 'focus');
  }, [ring]);

  useEffect(
    () => () => {
      if (still.current) clearTimeout(still.current);
    },
    [],
  );

  const cardRef = useCallback((id: string) => {
    let ref = refs.current.get(id);
    if (!ref) {
      ref = (view: View | null) => {
        if (view) {
          cards.current.set(id, view);
          return;
        }
        cards.current.delete(id);
        dispatch({ type: 'gone', id });
      };
      refs.current.set(id, ref);
    }
    return ref;
  }, []);

  const focus = useCallback(
    (id: string) => {
      const card = cards.current.get(id);
      const host = scroll.current;
      const inner = content.current;
      if (!card || !host || !inner) return;
      card.measureLayout(inner, (_x, y) => {
        const target = scrollTarget({
          cardY: y,
          topInset,
          bottomInset,
          contentHeight: contentHeight.current,
          viewportHeight: height,
        });
        if (!needsScroll(target, offset.current)) {
          dispatch({ type: 'show', id });
          return;
        }
        dispatch({ type: 'scrolling', id });
        host.scrollTo({ y: target, animated: !reduceMotion });
        if (still.current) clearTimeout(still.current);
        still.current = setTimeout(() => dispatch({ type: 'still' }), STILL_MS);
      });
    },
    [scroll, content, topInset, bottomInset, height, reduceMotion],
  );

  const clearRing = useCallback((key: number) => dispatch({ type: 'done', key }), []);
  const reset = useCallback(() => dispatch({ type: 'reset' }), []);

  const onScroll = useCallback(({ nativeEvent }: ScrollEvent) => {
    offset.current = nativeEvent.contentOffset.y;
    dispatch({ type: 'scrolled' });
  }, []);
  const onContentSizeChange = useCallback((_width: number, contentH: number) => {
    contentHeight.current = contentH;
  }, []);
  const onScrollBeginDrag = useCallback(() => dispatch({ type: 'dragged' }), []);
  const onMomentumScrollEnd = useCallback(({ nativeEvent }: ScrollEvent) => {
    offset.current = nativeEvent.contentOffset.y;
    dispatch({ type: 'settled' });
  }, []);

  return {
    ring,
    cardRef,
    focus,
    clearRing,
    reset,
    handlers: { onScroll, onContentSizeChange, onScrollBeginDrag, onMomentumScrollEnd },
  };
}

export type CardFocus = ReturnType<typeof useCardFocus>;

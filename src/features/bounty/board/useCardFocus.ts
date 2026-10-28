import { useCallback, useRef, useState, type RefObject } from 'react';
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

export type ScrollHost = {
  scroll: RefObject<ScrollView | null>;
  content: RefObject<View | null>;
  topInset: number;
};

type ScrollEvent = NativeSyntheticEvent<NativeScrollEvent>;

export function useCardFocus({ scroll, content, topInset }: ScrollHost) {
  const cards = useRef(new Map<string, View>());
  const refs = useRef(new Map<string, (view: View | null) => void>());
  const pending = useRef<string | null>(null);
  const offset = useRef<number | null>(null);
  const contentHeight = useRef(0);
  const { height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const [ring, setRing] = useState<{ id: string; key: number } | null>(null);

  const show = useCallback((id: string) => {
    pending.current = null;
    setRing((previous) => ({ id, key: (previous?.key ?? 0) + 1 }));
    const card = cards.current.get(id);
    if (card) AccessibilityInfo.sendAccessibilityEvent(card, 'focus');
  }, []);

  const cardRef = useCallback((id: string) => {
    let ref = refs.current.get(id);
    if (!ref) {
      ref = (view: View | null) => {
        if (view) cards.current.set(id, view);
        else cards.current.delete(id);
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
          contentHeight: contentHeight.current,
          viewportHeight: height,
        });
        if (!needsScroll(target, offset.current)) {
          show(id);
          return;
        }
        pending.current = id;
        host.scrollTo({ y: target, animated: !reduceMotion });
      });
    },
    [scroll, content, topInset, height, reduceMotion, show],
  );

  const clearRing = useCallback((key: number) => {
    setRing((current) => (current?.key === key ? null : current));
  }, []);

  const handlers = {
    onScroll: useCallback(({ nativeEvent }: ScrollEvent) => {
      offset.current = nativeEvent.contentOffset.y;
    }, []),
    onContentSizeChange: useCallback((_width: number, contentH: number) => {
      contentHeight.current = contentH;
    }, []),
    onScrollBeginDrag: useCallback(() => {
      pending.current = null;
    }, []),
    onMomentumScrollEnd: useCallback(
      ({ nativeEvent }: ScrollEvent) => {
        offset.current = nativeEvent.contentOffset.y;
        if (pending.current) show(pending.current);
      },
      [show],
    ),
  };

  return { ring, cardRef, focus, clearRing, handlers };
}

export type CardFocus = ReturnType<typeof useCardFocus>;

import { useCallback, useEffect, useRef, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { uiVerifyArgument, uiVerifyReduceMotion } from '@/lib/uiVerify';

import { viewStore } from './services';
import type { ScrollHost } from './useCardFocus';
import type { BoardView } from './viewStore';

const HINT_MS = Number(uiVerifyArgument('uiVerifyHintMs')) || 4000;

function launchView(userId: string) {
  const view = viewStore.boardView(userId);
  return { view, hint: view === 'map' && !viewStore.hintShown(userId) };
}

export function useBoardView(userId: string, { scroll, content, topInset }: ScrollHost) {
  const [launch] = useState(() => launchView(userId));
  const [view, setView] = useState<BoardView>(launch.view);
  const [hint, setHint] = useState(launch.hint);
  const reduceMotion = useReducedMotion() || uiVerifyReduceMotion;
  const title = useRef<View>(null);
  const offset = useRef(0);
  const listOffset = useRef(0);
  const restore = useRef<number | null>(null);

  useEffect(() => {
    if (launch.hint) viewStore.markHintShown(userId);
  }, [launch, userId]);

  useEffect(() => {
    if (!hint) return;
    const timer = setTimeout(() => setHint(false), HINT_MS);
    return () => clearTimeout(timer);
  }, [hint]);

  useEffect(() => {
    const y = restore.current;
    if (view !== 'list' || y === null) return;
    restore.current = null;
    const frame = requestAnimationFrame(() => scroll.current?.scrollTo({ y, animated: false }));
    return () => cancelAnimationFrame(frame);
  }, [view, scroll]);

  const titleUnderStrip = useCallback(() => {
    const heading = title.current;
    const inner = content.current;
    if (!heading || !inner) return;
    heading.measureLayout(inner, (_x, y) => {
      scroll.current?.scrollTo({ y: Math.max(0, y - topInset), animated: !reduceMotion });
    });
  }, [scroll, content, topInset, reduceMotion]);

  const choose = useCallback(
    (next: BoardView) => {
      if (next === view) return;
      viewStore.setBoardView(userId, next);
      setHint(false);
      if (next === 'map') {
        listOffset.current = offset.current;
        titleUnderStrip();
      } else {
        restore.current = listOffset.current;
      }
      setView(next);
    },
    [view, userId, titleUnderStrip],
  );

  const onScroll = useCallback(({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = nativeEvent.contentOffset.y;
  }, []);
  const onScrollBeginDrag = useCallback(() => setHint(false), []);
  const attachTitle = useCallback((node: View | null) => {
    title.current = node;
  }, []);

  return {
    current: view,
    choose,
    hint: hint && view === 'map',
    attachTitle,
    reduceMotion,
    handlers: { onScroll, onScrollBeginDrag },
  };
}

export type BoardViewModel = ReturnType<typeof useBoardView>;

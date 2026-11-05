import { useHeaderHeight } from 'expo-router/react-navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, PlatformColor, StyleSheet, type ScrollViewProps } from 'react-native';
import {
  KeyboardGestureArea,
  type KeyboardChatScrollViewRef,
} from 'react-native-keyboard-controller';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { space } from '@/ui/theme/tokens';

import { PAGE_SIZE } from '../chatService';
import { useChatThread } from '../hooks';
import { chatStore } from '../services';
import type { ThreadItem } from '../types';
import { ChatScrollView } from './ChatScrollView';
import { Composer, COMPOSER_INPUT_ID, COMPOSER_MIN_HEIGHT } from './Composer';
import { MessageBubble } from './MessageBubble';

const KEYBOARD_GAP = space.sm;
const KEEP_POSITION = { minIndexForVisible: 0 };
// The first page renders whole and stays transparent until it has scrolled to its end, so it opens at the newest message.
const FIRST_RENDER = PAGE_SIZE;

const keyOf = (item: ThreadItem) => item.key;
const renderItem = ({ item }: { item: ThreadItem }) => <MessageBubble item={item} />;

export function ThreadScreen({ threadId }: { threadId: string }) {
  const { items } = useChatThread(threadId);
  const oldestFirst = useMemo(() => [...items].reverse(), [items]);
  const { bottom } = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const scroll = useRef<KeyboardChatScrollViewRef>(null);
  const pinned = useRef(true);
  const dragging = useRef(false);
  const [shown, setShown] = useState(false);
  const extraContentPadding = useSharedValue(0);
  const offset = bottom - KEYBOARD_GAP;

  const onEndVisible = useCallback((visible: boolean) => {
    if (visible) pinned.current = true;
    else if (dragging.current) pinned.current = false;
  }, []);

  const renderScrollComponent = useCallback(
    (props: ScrollViewProps) => (
      <ChatScrollView
        {...props}
        scrollRef={scroll}
        offset={offset}
        extraContentPadding={extraContentPadding}
        onEndVisible={onEndVisible}
      />
    ),
    [offset, extraContentPadding, onEndVisible],
  );

  const count = useRef(0);
  useEffect(() => {
    count.current = oldestFirst.length;
  }, [oldestFirst.length]);
  const placedCount = useRef(0);
  const onContentSizeChange = useCallback((_width: number, height: number) => {
    if (height === 0 || !pinned.current) return;
    const arrived = placedCount.current > 0 && count.current > placedCount.current;
    scroll.current?.scrollToEnd({ animated: arrived });
    placedCount.current = count.current;
    setShown(true);
  }, []);

  const growth = useRef<number | null>(null);
  const onComposerHeight = useCallback(
    (height: number) => {
      const extra = Math.max(Math.round(height - COMPOSER_MIN_HEIGHT - bottom), 0);
      if (extra === growth.current) return;
      extraContentPadding.set(extra);
      growth.current = extra;
    },
    [extraContentPadding, bottom],
  );

  const onSend = (body: string) => {
    const sent = chatStore.send(threadId, body) !== null;
    if (sent) pinned.current = true;
    return sent;
  };

  return (
    <KeyboardGestureArea
      style={styles.root}
      offset={COMPOSER_MIN_HEIGHT}
      textInputNativeID={COMPOSER_INPUT_ID}
    >
      <FlatList
        testID="chat-thread-list"
        style={shown ? undefined : styles.placing}
        data={oldestFirst}
        keyExtractor={keyOf}
        renderItem={renderItem}
        renderScrollComponent={renderScrollComponent}
        initialNumToRender={FIRST_RENDER}
        maintainVisibleContentPosition={KEEP_POSITION}
        onContentSizeChange={onContentSizeChange}
        contentContainerStyle={{
          paddingTop: headerHeight + space.sm,
          paddingBottom: COMPOSER_MIN_HEIGHT + bottom + space.sm,
        }}
        onScrollBeginDrag={() => {
          dragging.current = true;
          pinned.current = false;
        }}
        onScrollEndDrag={() => {
          dragging.current = false;
        }}
        onStartReached={() => void chatStore.loadOlder(threadId)}
      />
      <Composer
        bottomInset={bottom}
        keyboardGap={KEYBOARD_GAP}
        onHeight={onComposerHeight}
        onSend={onSend}
      />
    </KeyboardGestureArea>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PlatformColor('systemBackground') },
  placing: { opacity: 0 },
});

import { useHeaderHeight } from 'expo-router/react-navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  PlatformColor,
  StyleSheet,
  View,
  type ScrollViewProps,
} from 'react-native';
import {
  KeyboardGestureArea,
  type KeyboardChatScrollViewRef,
} from 'react-native-keyboard-controller';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { InlineState } from '@/ui/InlineState';
import { space, vars } from '@/ui/theme/tokens';

import { PAGE_SIZE } from '../chatService';
import { useChatThread, useChatUserId } from '../hooks';
import { chatStore } from '../services';
import type { ThreadInfo } from '../types';
import { ChatScrollView } from './ChatScrollView';
import { Composer, COMPOSER_INPUT_ID, COMPOSER_MIN_HEIGHT } from './Composer';
import { MessageBubble } from './MessageBubble';
import { SafetyCard } from './SafetyCard';
import { ThreadTop } from './ThreadTop';
import { bubbleRows, type BubbleRow } from './threadView';

const KEYBOARD_GAP = space.sm;
const KEEP_POSITION = { minIndexForVisible: 0 };
// The first page renders whole and stays transparent until it has scrolled to its end, so it opens at the newest message.
const FIRST_RENDER = PAGE_SIZE;

const keyOf = (row: BubbleRow) => row.key;

export function ThreadScreen({
  threadId,
  onOpenItem,
}: {
  threadId: string;
  onOpenItem: (info: ThreadInfo) => void;
}) {
  const { t, language } = useI18n();
  const userId = useChatUserId();
  const { thread, items, seenMessageId } = useChatThread(threadId);
  const info = thread?.info ?? null;
  const [openedAt] = useState(() => Date.now());
  const now = thread?.loadedAt ? Date.parse(thread.loadedAt) : openedAt;
  const rows = useMemo(
    () => bubbleRows([...items].reverse(), info, seenMessageId, now, t, language),
    [items, info, seenMessageId, now, t, language],
  );
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

  const renderItem = useCallback(
    ({ item }: { item: BubbleRow }) => <MessageBubble row={item} />,
    [],
  );

  const count = useRef(0);
  useEffect(() => {
    count.current = rows.length;
  }, [rows.length]);
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

  const loading = !thread || (thread.status === 'loading' && !info);
  const failed = thread?.status === 'failed' && !info;
  const header = (
    <View>
      {thread?.older === 'loading' ? <ActivityIndicator style={styles.older} /> : null}
      {thread?.older === 'failed' ? (
        <View style={styles.inset}>
          <InlineState
            text={t('chat.thread.olderFailed')}
            action={{
              label: t('chat.thread.retry'),
              onPress: () => void chatStore.loadOlder(threadId),
              testID: 'chat-thread-older-retry',
            }}
            testID="chat-thread-older-failed"
          />
        </View>
      ) : null}
      {info && !thread?.hasMore ? <SafetyCard /> : null}
      {loading ? (
        <ActivityIndicator
          style={styles.loading}
          accessibilityLabel={t('chat.thread.loading')}
          testID="chat-thread-loading"
        />
      ) : null}
      {failed ? (
        <View style={styles.inset}>
          <InlineState
            text={t('chat.thread.loadFailed')}
            action={{
              label: t('chat.thread.retry'),
              onPress: () => void chatStore.reloadThread(threadId),
              testID: 'chat-thread-retry',
            }}
            testID="chat-thread-failed"
          />
        </View>
      ) : null}
    </View>
  );

  return (
    <KeyboardGestureArea
      style={styles.root}
      offset={COMPOSER_MIN_HEIGHT}
      textInputNativeID={COMPOSER_INPUT_ID}
    >
      <ThreadTop
        threadId={threadId}
        thread={thread}
        top={headerHeight}
        now={now}
        onOpenItem={onOpenItem}
      />
      <FlatList
        testID="chat-thread-list"
        style={shown ? undefined : styles.placing}
        data={rows}
        keyExtractor={keyOf}
        renderItem={renderItem}
        renderScrollComponent={renderScrollComponent}
        initialNumToRender={FIRST_RENDER}
        maintainVisibleContentPosition={KEEP_POSITION}
        onContentSizeChange={onContentSizeChange}
        ListHeaderComponent={header}
        contentContainerStyle={{
          paddingTop: space.sm,
          paddingBottom: COMPOSER_MIN_HEIGHT + bottom + space.sm,
        }}
        onScrollBeginDrag={() => {
          dragging.current = true;
          pinned.current = false;
        }}
        onScrollEndDrag={() => {
          dragging.current = false;
        }}
        onStartReached={() => {
          if (thread?.older !== 'failed') void chatStore.loadOlder(threadId);
        }}
      />
      {info?.left ? (
        <View
          style={[styles.left, { paddingBottom: bottom + space.md }]}
          testID="chat-thread-left"
          accessible
          accessibilityLabel={t('chat.thread.left')}
        >
          <AppText variant="secondary" tone="secondaryLabel" style={styles.leftText}>
            {t('chat.thread.left')}
          </AppText>
        </View>
      ) : info && userId ? (
        <Composer
          userId={userId}
          threadId={threadId}
          bottomInset={bottom}
          keyboardGap={KEYBOARD_GAP}
          onHeight={onComposerHeight}
          onSend={onSend}
        />
      ) : null}
    </KeyboardGestureArea>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PlatformColor('systemBackground') },
  placing: { opacity: 0 },
  inset: { marginHorizontal: space.md, marginBottom: space.md },
  older: { minHeight: vars['--touch-min'] },
  loading: { minHeight: vars['--touch-min'] * 2 },
  left: {
    backgroundColor: PlatformColor('systemBackground'),
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: space.md,
    paddingHorizontal: space.lg,
  },
  leftText: { textAlign: 'center' },
});

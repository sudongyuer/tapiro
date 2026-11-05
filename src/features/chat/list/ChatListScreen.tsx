import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  PlatformColor,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { localClock } from '@/lib/deviceClock';
import { useI18n } from '@/lib/i18n';
import { useLiveOffline } from '@/lib/live';
import { InlineState } from '@/ui/InlineState';
import { OfflineLine } from '@/ui/OfflineLine';
import { vars } from '@/ui/theme/tokens';

import { useChatList, useChatUserId } from '../hooks';
import { chatStore } from '../services';
import type { ThreadSummary } from '../types';
import { ChatEmpty } from './ChatEmpty';
import { ThreadRow } from './ThreadRow';

type Actions = { onOpen: (threadId: string) => void; onBrowse: () => void };

const keyOf = (row: ThreadSummary) => row.id;
const NO_THREADS: ThreadSummary[] = [];

function useBusy(run: () => Promise<unknown>) {
  const [busy, setBusy] = useState(false);
  const start = useCallback(() => {
    setBusy(true);
    void run().finally(() => setBusy(false));
  }, [run]);
  return [busy, start] as const;
}

const reload = () => chatStore.reloadList();

export function ChatListScreen({ onOpen, onBrowse }: Actions) {
  const { t } = useI18n();
  const list = useChatList();
  const me = useChatUserId() ?? '';
  const offline = useLiveOffline();
  const [pulling, pull] = useBusy(reload);
  const [retrying, retry] = useBusy(reload);
  const threads = list.status === 'idle' ? NO_THREADS : list.threads;
  const loadedAt = list.status === 'idle' ? null : list.loadedAt;
  const now = loadedAt ? Date.parse(loadedAt) : 0;

  const renderItem = useCallback(
    ({ item, index }: { item: ThreadSummary; index: number }) => (
      <ThreadRow
        row={item}
        me={me}
        now={now}
        first={index === 0}
        last={index === threads.length - 1}
        onOpen={onOpen}
      />
    ),
    [me, now, threads.length, onOpen],
  );

  if (list.status === 'ready' && threads.length === 0) {
    return <ChatEmpty onBrowse={onBrowse} refreshing={pulling} onRefresh={pull} />;
  }

  const loading = list.status === 'idle' || list.status === 'loading';
  const header = (
    <View style={styles.header}>
      {offline ? <OfflineLine text={t('live.offline')} testID="chat-list-offline" /> : null}
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator
            accessibilityLabel={t('chat.list.loading')}
            testID="chat-list-loading"
          />
        </View>
      ) : null}
      {list.status === 'failed' ? (
        <InlineState
          text={t('chat.list.failed')}
          action={{
            label: t('chat.list.retry'),
            onPress: retry,
            testID: 'chat-list-retry',
            busy: retrying,
          }}
          testID="chat-list-failed"
        />
      ) : null}
      {list.status === 'stale' && loadedAt ? (
        <InlineState
          tone="warning"
          text={t('live.staleAt', { time: localClock(now) })}
          action={{
            label: t('chat.list.retry'),
            onPress: retry,
            testID: 'chat-list-retry',
            busy: retrying,
          }}
          testID="chat-list-stale"
        />
      ) : null}
    </View>
  );

  const more = list.status === 'ready' ? list.more : 'idle';
  const footer =
    more === 'loading' ? (
      <View style={styles.loading}>
        <ActivityIndicator
          accessibilityLabel={t('chat.list.moreLoading')}
          testID="chat-list-more-loading"
        />
      </View>
    ) : more === 'failed' ? (
      <InlineState
        text={t('chat.list.moreFailed')}
        action={{
          label: t('chat.list.retry'),
          onPress: () => void chatStore.loadMoreThreads(),
          testID: 'chat-list-more-retry',
        }}
        testID="chat-list-more-failed"
      />
    ) : undefined;

  return (
    <FlatList
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      data={threads}
      keyExtractor={keyOf}
      renderItem={renderItem}
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      ListFooterComponentStyle={styles.footer}
      onEndReached={() => {
        if (more !== 'failed') void chatStore.loadMoreThreads();
      }}
      onEndReachedThreshold={1}
      refreshControl={<RefreshControl refreshing={pulling} onRefresh={pull} />}
      testID="chat-list"
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PlatformColor('systemGroupedBackground') },
  content: { paddingHorizontal: vars['--space-4'], paddingBottom: vars['--space-7'] },
  header: { gap: vars['--space-3'], paddingBottom: vars['--space-3'] },
  footer: { paddingTop: vars['--space-3'] },
  loading: { minHeight: vars['--touch-min'] * 2, alignItems: 'center', justifyContent: 'center' },
});

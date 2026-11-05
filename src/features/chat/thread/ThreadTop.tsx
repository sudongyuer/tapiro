import { StyleSheet, View } from 'react-native';

import { localClock } from '@/lib/deviceClock';
import { useI18n } from '@/lib/i18n';
import { useLiveOffline } from '@/lib/live';
import { InlineState } from '@/ui/InlineState';
import { OfflineLine } from '@/ui/OfflineLine';
import { space } from '@/ui/theme/tokens';

import type { ThreadState } from '../chatStore';
import { chatStore } from '../services';
import type { ThreadInfo } from '../types';
import { ItemCard } from './ItemCard';

export function ThreadTop({
  threadId,
  thread,
  top,
  now,
  blockFailed,
  onOpenItem,
}: {
  threadId: string;
  thread: ThreadState | undefined;
  top: number;
  now: number;
  blockFailed: boolean;
  onOpenItem: (info: ThreadInfo) => void;
}) {
  const { t } = useI18n();
  const offline = useLiveOffline();
  const stale = thread?.status === 'stale' && thread.reloadFailed && thread.loadedAt;
  return (
    <View style={[styles.top, { paddingTop: top + space.sm }]}>
      {thread?.info ? <ItemCard info={thread.info} now={now} onOpen={onOpenItem} /> : null}
      {blockFailed ? (
        <View style={styles.inset}>
          <InlineState tone="warning" text={t('block.failed')} testID="chat-thread-block-failed" />
        </View>
      ) : null}
      {offline ? <OfflineLine text={t('live.offline')} testID="chat-thread-offline" /> : null}
      {stale ? (
        <View style={styles.inset}>
          <InlineState
            tone="warning"
            text={t('live.staleAt', { time: localClock(Date.parse(stale)) })}
            action={{
              label: t('chat.thread.retry'),
              onPress: () => void chatStore.reloadThread(threadId),
              testID: 'chat-thread-retry',
            }}
            testID="chat-thread-stale"
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { gap: space.sm },
  inset: { marginHorizontal: space.md },
});

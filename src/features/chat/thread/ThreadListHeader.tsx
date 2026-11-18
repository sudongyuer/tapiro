import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { InlineState } from '@/ui/InlineState';
import { space, vars } from '@/ui/theme/tokens';

import type { ThreadState } from '../chatState';
import { chatStore } from '../services';
import { SafetyCard } from './SafetyCard';

export function ThreadListHeader({
  threadId,
  thread,
}: {
  threadId: string;
  thread: ThreadState | null | undefined;
}) {
  const { t } = useI18n();
  const info = thread?.info ?? null;
  const loading = !thread || (thread.status === 'loading' && !info);
  const failed = thread?.status === 'failed' && !info;
  return (
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
}

const styles = StyleSheet.create({
  inset: { marginHorizontal: space.md, marginBottom: space.md },
  older: { minHeight: vars['--touch-min'] },
  loading: { minHeight: vars['--touch-min'] * 2 },
});

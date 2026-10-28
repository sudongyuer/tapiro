import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { InlineState } from '@/ui/InlineState';
import { vars } from '@/ui/theme/tokens';

import { malaysiaClock } from './malaysiaClock';
import type { BoardFilter, BoardState } from './types';

type Ready = Extract<BoardState, { kind: 'ready' }>;

export function BoardLoading({ testID }: { testID: string }) {
  const { t } = useI18n();
  return (
    <View style={styles.loading}>
      <ActivityIndicator accessibilityLabel={t('bounty.board.state.loading')} testID={testID} />
    </View>
  );
}

export function BoardFailed({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <InlineState
      text={t('bounty.board.state.failed')}
      action={{
        label: t('bounty.board.state.retry'),
        onPress: onRetry,
        testID: 'bounty-board-retry',
      }}
      testID="bounty-board-failed"
    />
  );
}

const FILTER_EMPTY = {
  urgent: 'bounty.board.state.emptyUrgent',
  fits_my_time: 'bounty.board.state.emptyFits',
} as const;

export function BoardEmpty({
  filter,
  onPost,
  onShowAll,
}: {
  filter: BoardFilter;
  onPost: () => void;
  onShowAll: () => void;
}) {
  const { t } = useI18n();
  if (filter === 'all') {
    return (
      <InlineState
        text={t('bounty.board.state.empty')}
        action={{
          label: t('bounty.board.state.post'),
          onPress: onPost,
          testID: 'bounty-board-post',
        }}
        testID="bounty-board-empty"
      />
    );
  }
  return (
    <InlineState
      text={t(FILTER_EMPTY[filter])}
      action={{
        label: t('bounty.board.state.showAll'),
        onPress: onShowAll,
        testID: 'bounty-board-show-all',
      }}
      testID="bounty-board-filter-empty"
    />
  );
}

export function BoardStale({
  loadedAt,
  busy,
  onRetry,
}: {
  loadedAt: string;
  busy: boolean;
  onRetry: () => void;
}) {
  const { t } = useI18n();
  return (
    <InlineState
      tone="warning"
      text={t('bounty.board.state.stale', { time: malaysiaClock(loadedAt) })}
      action={{
        label: t('bounty.board.state.retry'),
        onPress: onRetry,
        testID: 'bounty-board-retry',
        busy,
      }}
      testID="bounty-board-stale"
    />
  );
}

export function BoardFooter({ state, onRetryPage }: { state: Ready; onRetryPage: () => void }) {
  const { t } = useI18n();
  if (state.page === 'loading') return <BoardLoading testID="bounty-board-page-loading" />;
  if (state.page === 'failed') {
    return (
      <InlineState
        text={t('bounty.board.state.pageFailed')}
        action={{
          label: t('bounty.board.state.retry'),
          onPress: onRetryPage,
          testID: 'bounty-board-page-retry',
        }}
        testID="bounty-board-page-failed"
      />
    );
  }
  if (state.next !== null) return null;
  return <InlineState text={t('bounty.board.state.end')} testID="bounty-board-end" />;
}

const styles = StyleSheet.create({
  loading: { minHeight: vars['--touch-min'] * 2, alignItems: 'center', justifyContent: 'center' },
});

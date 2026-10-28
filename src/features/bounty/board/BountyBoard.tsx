import { Host } from '@expo/ui/swift-ui';
import { PlatformColor, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { TaskCard } from '@/ui/TaskCard';
import { vars } from '@/ui/theme/tokens';

import { ringgit } from '../post/blockedReason';
import { formatDistance } from './axis';
import { BoardEmpty, BoardFailed, BoardFooter, BoardLoading, BoardStale } from './BoardStates';
import { boardTotal } from './boardState';
import { FilterChips } from './FilterChips';
import type { BoardRow } from './types';
import type { BountyBoardModel } from './useBountyBoard';

export function BountyBoard({ board, onPost }: { board: BountyBoardModel; onPost: () => void }) {
  const { t } = useI18n();
  return (
    <View testID="bounty-board" style={styles.board}>
      <AppText
        variant="title"
        accessibilityRole="header"
        testID="bounty-board-title"
        style={styles.title}
      >
        {t('bounty.board.title')}
      </AppText>
      <FilterChips
        filter={board.filter}
        total={boardTotal(board.state)}
        onChange={board.setFilter}
      />
      <BoardBody board={board} onPost={onPost} />
    </View>
  );
}

function BoardBody({ board, onPost }: { board: BountyBoardModel; onPost: () => void }) {
  const { state } = board;
  if (state.kind === 'loading') return <BoardLoading testID="bounty-board-loading" />;
  if (state.kind === 'failed') return <BoardFailed onRetry={board.retry} />;
  return (
    <>
      {state.refreshFailed ? (
        <BoardStale loadedAt={state.loadedAt} busy={board.retryBusy} onRetry={board.retryRefresh} />
      ) : null}
      {state.rows.length === 0 ? (
        <BoardEmpty
          filter={board.filter}
          onPost={onPost}
          onShowAll={() => board.setFilter('all')}
        />
      ) : (
        <>
          {state.rows.map((row) => (
            <BoardRowCard key={row.id} row={row} />
          ))}
          <BoardFooter state={state} onRetryPage={board.retryPage} />
        </>
      )}
    </>
  );
}

function BoardRowCard({ row }: { row: BoardRow }) {
  const { t, language } = useI18n();
  const reward = ringgit(row.rewardSen, language);
  const distance = row.distanceM === null ? null : formatDistance(row.distanceM, language);
  const meta =
    row.placeLabel && distance
      ? t('bounty.board.card.place', { place: row.placeLabel, distance })
      : (row.placeLabel ?? distance);
  return (
    <View style={styles.card}>
      <Host matchContents={{ vertical: true }}>
        <TaskCard
          category={row.category}
          title={row.title}
          meta={meta}
          reward={reward}
          rewardLabel={t('bounty.post.confirm.rewardLabel', { amount: reward })}
          testID={`bounty-card-${row.id}`}
        />
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  board: { gap: vars['--space-3'], paddingTop: vars['--space-4'] },
  title: { fontWeight: '700', paddingHorizontal: 2 },
  card: {
    padding: vars['--space-4'],
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
    backgroundColor: PlatformColor('secondarySystemGroupedBackground'),
  },
});

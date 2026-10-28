import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { vars } from '@/ui/theme/tokens';

import { BoardCard } from './BoardCard';
import { BoardEmpty, BoardFailed, BoardFooter, BoardLoading, BoardStale } from './BoardStates';
import { boardTotal } from './boardState';
import { FilterChips } from './FilterChips';
import type { BoardOrigin, BoardRow } from './types';
import type { BountyBoardModel } from './useBountyBoard';

type Handlers = {
  onPost: () => void;
  onOpen: (id: string) => void;
  onApply: (id: string) => void;
};

export function BountyBoard({ board, ...handlers }: Handlers & { board: BountyBoardModel }) {
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
      <BoardBody board={board} {...handlers} />
    </View>
  );
}

function BoardBody({ board, onPost, onOpen, onApply }: Handlers & { board: BountyBoardModel }) {
  const { state } = board;
  if (state.kind === 'loading') return <BoardLoading testID="bounty-board-loading" />;
  if (state.kind === 'failed') return <BoardFailed onRetry={board.retry} />;
  const firstUnlocated = unlocatedFrom(board.origin, state.rows);
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
            <Fragment key={row.id}>
              {row.id === firstUnlocated ? <UnlocatedHeader /> : null}
              <BoardCard row={row} onOpen={onOpen} onApply={onApply} />
            </Fragment>
          ))}
          <BoardFooter state={state} onRetryPage={board.retryPage} />
        </>
      )}
    </>
  );
}

function unlocatedFrom(origin: BoardOrigin | null, rows: BoardRow[]) {
  if (!origin || origin.kind === 'none') return null;
  return rows.find((row) => row.distanceM === null)?.id ?? null;
}

function UnlocatedHeader() {
  const { t } = useI18n();
  return (
    <AppText
      variant="meta"
      tone="secondaryLabel"
      accessibilityRole="header"
      testID="bounty-board-unlocated"
      style={styles.unlocated}
    >
      {t('bounty.board.unlocated')}
    </AppText>
  );
}

const styles = StyleSheet.create({
  board: { gap: vars['--space-3'], paddingTop: vars['--space-4'] },
  title: { fontWeight: '700', paddingHorizontal: 2 },
  unlocated: { paddingHorizontal: vars['--space-4'], paddingTop: vars['--space-2'] },
});

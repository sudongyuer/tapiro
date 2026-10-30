import { useHeaderHeight } from 'expo-router/react-navigation';
import { useState } from 'react';
import { PlatformColor, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BountyMapCamera } from 'tapiro-kit';

import { vars } from '@/ui/theme/tokens';

import { BoardEmpty, BoardFailed, BoardLoading, BoardStale } from '../board/BoardStates';
import { boardBody, boardTotal } from '../board/boardState';
import { FilterChips } from '../board/FilterChips';
import type { BountyBoardModel } from '../board/useBountyBoard';
import { BoardMap } from './BoardMap';

type CoverProps = {
  board: BountyBoardModel;
  start: BountyMapCamera | null;
  onPost: () => void;
  onOpen: (id: string) => void;
  onApply: (id: string) => void;
};

export function BoardMapCover({ board, start, onPost, onOpen, onApply }: CoverProps) {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const [top, setTop] = useState(headerHeight);
  const { state } = board;
  const body = boardBody(state, board.refreshing);
  const loading = state.kind === 'loading' || body === 'loading';
  const failed = state.kind === 'failed' || body === 'failed';
  const ready = state.kind === 'ready' && !loading && !failed;
  const showMore = () =>
    void (state.kind === 'ready' && state.page === 'failed' ? board.retryPage() : board.loadMore());

  return (
    <View
      testID="bounty-map-cover"
      style={[styles.screen, { backgroundColor: PlatformColor('systemBackground') }]}
    >
      {ready ? (
        <BoardMap
          rows={state.rows}
          origin={board.origin}
          state={state}
          onOpen={onOpen}
          onApply={onApply}
          onShowMore={showMore}
          cover={{ top, bottom: insets.bottom + vars['--space-3'], start }}
        />
      ) : null}
      <View
        pointerEvents="box-none"
        style={[styles.top, { paddingTop: headerHeight }]}
        onLayout={({ nativeEvent }) => setTop(nativeEvent.layout.height)}
      >
        <FilterChips filter={board.filter} total={boardTotal(state)} onChange={board.setFilter} />
        {loading ? <BoardLoading testID="bounty-board-loading" /> : null}
        {failed ? <BoardFailed onRetry={board.retry} /> : null}
        {ready && state.refreshFailed ? (
          <BoardStale
            loadedAt={state.loadedAt}
            busy={board.retryBusy}
            onRetry={board.retryRefresh}
          />
        ) : null}
        {ready && body === 'empty' ? (
          <BoardEmpty
            filter={board.filter}
            onPost={onPost}
            onShowAll={() => board.setFilter('all')}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    gap: vars['--space-2'],
    paddingHorizontal: vars['--space-4'],
  },
});

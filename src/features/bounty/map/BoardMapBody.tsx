import type { BountyMapCamera } from 'tapiro-kit';

import { BoardEmpty, BoardFailed, BoardLoading, BoardStale } from '../board/BoardStates';
import { boardBody } from '../board/boardState';
import type { BountyBoardModel } from '../board/useBountyBoard';
import { BoardMap } from './BoardMap';

type Handlers = {
  onPost: () => void;
  onOpen: (id: string) => void;
  onApply: (id: string) => void;
  onPickPlace: () => void;
  onExpand?: (camera: BountyMapCamera | null) => void;
  radiusM?: number;
};

export function BoardMapBody({
  board,
  radiusM,
  ...handlers
}: Handlers & { board: BountyBoardModel }) {
  const { state } = board;
  const body = boardBody(state, board.refreshing);
  if (state.kind === 'loading' || body === 'loading') {
    return <BoardLoading testID="bounty-board-loading" />;
  }
  if (state.kind === 'failed' || body === 'failed') return <BoardFailed onRetry={board.retry} />;
  const showMore = () => void (state.page === 'failed' ? board.retryPage() : board.loadMore());
  return (
    <>
      {state.refreshFailed ? (
        <BoardStale loadedAt={state.loadedAt} busy={board.retryBusy} onRetry={board.retryRefresh} />
      ) : null}
      {body === 'empty' ? (
        <BoardEmpty
          filter={board.filter}
          onPost={handlers.onPost}
          onShowAll={() => board.setFilter('all')}
        />
      ) : null}
      <BoardMap
        rows={state.rows}
        origin={board.origin}
        state={state}
        onOpen={handlers.onOpen}
        onApply={handlers.onApply}
        onPickPlace={handlers.onPickPlace}
        onShowMore={showMore}
        onExpand={handlers.onExpand}
        radiusM={radiusM}
      />
    </>
  );
}

import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LayoutAnimationConfig,
  ReduceMotion,
} from 'react-native-reanimated';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { vars } from '@/ui/theme/tokens';

import { BoardMap } from '../map/BoardMap';
import { BoardCard } from './BoardCard';
import { BoardEmpty, BoardFailed, BoardFooter, BoardLoading, BoardStale } from './BoardStates';
import { boardBody, boardTotal } from './boardState';
import { BoardTitleRow } from './BoardTitleRow';
import { DistanceAxis } from './DistanceAxis';
import { FilterChips } from './FilterChips';
import { FocusRing } from './FocusRing';
import { LocationCard } from './LocationCard';
import { PlaceRow } from './PlaceRow';
import type { BoardOrigin, BoardRow } from './types';
import type { BountyBoardModel } from './useBountyBoard';

const CROSS_FADE_MS = 200;

type Handlers = {
  onPost: () => void;
  onOpen: (id: string) => void;
  onApply: (id: string) => void;
  onPickPlace: () => void;
};

export function BountyBoard({ board, ...handlers }: Handlers & { board: BountyBoardModel }) {
  const { view } = board;
  const reduce = view.reduceMotion ? ReduceMotion.Always : ReduceMotion.System;
  return (
    <View testID="bounty-board" style={styles.board}>
      <BoardTitleRow
        view={view.current}
        hint={view.hint}
        reduceMotion={view.reduceMotion}
        onChoose={view.choose}
        onTitle={view.attachTitle}
      />
      <FilterChips
        filter={board.filter}
        total={boardTotal(board.state)}
        onChange={board.setFilter}
      />
      <LayoutAnimationConfig skipEntering>
        <Animated.View
          key={view.current}
          entering={FadeIn.duration(CROSS_FADE_MS).reduceMotion(reduce)}
          exiting={FadeOut.duration(CROSS_FADE_MS).reduceMotion(reduce)}
          testID={`bounty-board-${view.current}-view`}
          style={styles.body}
        >
          {view.current === 'map' ? (
            <MapBody board={board} {...handlers} />
          ) : (
            <>
              <OriginBar board={board} axis onPickPlace={handlers.onPickPlace} />
              <BoardBody board={board} {...handlers} />
            </>
          )}
        </Animated.View>
      </LayoutAnimationConfig>
    </View>
  );
}

function MapBody({ board, onOpen, onApply, onPickPlace }: Handlers & { board: BountyBoardModel }) {
  const { origin, state } = board;
  if (!origin) return <BoardLoading testID="bounty-board-loading" />;
  if (origin.kind === 'none') {
    return <OriginBar board={board} axis={false} onPickPlace={onPickPlace} />;
  }
  return (
    <>
      <OriginBar board={board} axis={false} onPickPlace={onPickPlace} />
      <BoardMap
        rows={state.kind === 'ready' ? state.rows : []}
        origin={origin}
        state={state}
        onOpen={onOpen}
        onApply={onApply}
        onPickPlace={onPickPlace}
        onShowMore={() => void board.loadMore()}
      />
    </>
  );
}

function OriginBar({
  board,
  axis: withAxis,
  onPickPlace,
}: {
  board: BountyBoardModel;
  axis: boolean;
  onPickPlace: () => void;
}) {
  const { origin, state } = board;
  if (!origin) return null;
  if (origin.kind === 'none') {
    return origin.reason === 'undetermined' ? (
      <LocationCard
        busy={board.allowing}
        onAllow={board.allowLocation}
        onLater={board.dismissLocation}
      />
    ) : (
      <PlaceRow chosen={null} onPick={onPickPlace} />
    );
  }
  const axis =
    withAxis && state.kind === 'ready' && state.rows.length > 0 ? (
      <DistanceAxis
        rows={state.rows}
        beyondTotal={state.beyondTotal}
        next={state.next}
        origin={origin.kind}
        onFocus={board.focus.focus}
      />
    ) : null;
  return origin.kind === 'place' ? (
    <>
      <PlaceRow chosen={origin.label} onPick={onPickPlace} />
      {axis}
    </>
  ) : (
    axis
  );
}

function BoardBody({ board, onPost, onOpen, onApply }: Handlers & { board: BountyBoardModel }) {
  const { state, focus } = board;
  const body = boardBody(state, board.refreshing);
  if (state.kind === 'loading') return <BoardLoading testID="bounty-board-loading" />;
  if (state.kind === 'failed' || body === 'failed') return <BoardFailed onRetry={board.retry} />;
  const firstUnlocated = unlocatedFrom(board.origin, state.rows);
  return (
    <>
      {state.refreshFailed ? (
        <BoardStale loadedAt={state.loadedAt} busy={board.retryBusy} onRetry={board.retryRefresh} />
      ) : null}
      {body === 'loading' ? (
        <BoardLoading testID="bounty-board-loading" />
      ) : body === 'empty' ? (
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
              <BoardCard
                row={row}
                onOpen={onOpen}
                onApply={onApply}
                cardRef={focus.cardRef(row.id)}
                ring={
                  focus.ring?.id === row.id ? (
                    <FocusRing
                      key={focus.ring.key}
                      ringKey={focus.ring.key}
                      onDone={focus.clearRing}
                    />
                  ) : null
                }
              />
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
  body: { gap: vars['--space-3'] },
  unlocated: { paddingHorizontal: vars['--space-4'], paddingTop: vars['--space-2'] },
});

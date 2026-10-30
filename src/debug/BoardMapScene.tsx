import { useRouter } from 'expo-router';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { PlatformColor, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fixtureUser } from '@/features/account';
import { useBountyBoard } from '@/features/bounty';
import { boardTotal } from '@/features/bounty/board/boardState';
import { FilterChips } from '@/features/bounty/board/FilterChips';
import { LocationCard } from '@/features/bounty/board/LocationCard';
import { PlaceRow } from '@/features/bounty/board/PlaceRow';
import type { BountyBoardModel } from '@/features/bounty/board/useBountyBoard';
import { BoardMapBody } from '@/features/bounty/map/BoardMapBody';
import { uiVerifyArgument } from '@/lib/uiVerify';
import { vars } from '@/ui/theme/tokens';

function OriginStandIn({ board, onPick }: { board: BountyBoardModel; onPick: () => void }) {
  const { origin } = board;
  if (!origin) return null;
  if (origin.kind === 'place') return <PlaceRow chosen={origin.label} onPick={onPick} />;
  if (origin.kind === 'me') return null;
  return origin.reason === 'undetermined' ? (
    <LocationCard
      busy={board.allowing}
      onAllow={board.allowLocation}
      onLater={board.dismissLocation}
    />
  ) : (
    <PlaceRow chosen={null} onPick={onPick} />
  );
}

export function BoardMapScene({ onReady }: { onReady: () => void }) {
  const router = useRouter();
  const scroll = useRef<ScrollView>(null);
  const content = useRef<View>(null);
  const insets = useSafeAreaInsets();
  const board = useBountyBoard(fixtureUser('apple').id, {
    scroll,
    content,
    topInset: insets.top + vars['--space-3'],
    bottomInset: insets.bottom,
  });
  const [left, setLeft] = useState<string | null>(null);
  useEffect(onReady, [onReady]);
  const pick = () => setLeft('pick-place');
  return (
    <>
      <ScrollView
        ref={scroll}
        innerViewRef={content as RefObject<View>}
        testID="bounty-map-scene"
        contentInsetAdjustmentBehavior="automatic"
        style={styles.screen}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={board.pulling} onRefresh={board.pull} />}
      >
        <FilterChips
          filter={board.filter}
          total={boardTotal(board.state)}
          onChange={board.setFilter}
        />
        <OriginStandIn board={board} onPick={pick} />
        <BoardMapBody
          board={board}
          onPost={() => setLeft('post')}
          onOpen={(id) =>
            router.push({ pathname: '/bounty/[id]', params: { id } }, { withAnchor: true })
          }
          onApply={(id) =>
            router.push({ pathname: '/bounty-apply/[id]', params: { id, from: 'card' } })
          }
          onPickPlace={pick}
          radiusM={Number(uiVerifyArgument('uiVerifyMapRadius')) || undefined}
        />
      </ScrollView>
      {left ? <View testID={`bounty-map-scene-${left}`} accessible style={styles.marker} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  marker: { position: 'absolute', width: 1, height: 1 },
  screen: { flex: 1, backgroundColor: PlatformColor('systemGroupedBackground') },
  content: {
    gap: vars['--space-3'],
    paddingHorizontal: vars['--space-4'],
    paddingBottom: vars['--space-7'],
  },
});

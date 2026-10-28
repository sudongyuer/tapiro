import { useEffect, useRef, useState, type RefObject } from 'react';
import { PlatformColor, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fixtureUser } from '@/features/account';
import {
  BountyBoard,
  BountyDetailScreen,
  PlaceSearchScreen,
  PostConfirm,
  PostForm,
  useBountyBoard,
} from '@/features/bounty';
import { uiVerifyArgument } from '@/lib/uiVerify';
import { vars } from '@/ui/theme/tokens';

function Marker({ name }: { name: string | null }) {
  return name ? (
    <View testID={`bounty-post-scene-${name}`} accessible style={styles.marker} />
  ) : null;
}

export function BountyPostScene({ onReady }: { onReady: () => void }) {
  const [left, setLeft] = useState<'next' | 'close' | 'place' | null>(null);
  useEffect(onReady, [onReady]);
  return (
    <>
      <PostForm
        userId={fixtureUser('apple').id}
        onNext={() => setLeft('next')}
        onClose={() => setLeft('close')}
        onPickPlace={() => setLeft('place')}
      />
      <Marker name={left} />
    </>
  );
}

export function BountyConfirmScene({ onReady }: { onReady: () => void }) {
  const [left, setLeft] = useState<string | null>(null);
  useEffect(onReady, [onReady]);
  return (
    <>
      <PostConfirm
        userId={fixtureUser('apple').id}
        onPublished={() => setLeft('published')}
        onPay={(paymentId) => setLeft(`pay-${paymentId}`)}
        onBack={() => setLeft('back')}
      />
      <Marker name={left} />
    </>
  );
}

export function PlaceSearchScene({ onReady }: { onReady: () => void }) {
  const [picked, setPicked] = useState(0);
  useEffect(onReady, [onReady]);
  return (
    <>
      <PlaceSearchScreen purpose="post" onPicked={() => setPicked((count) => count + 1)} />
      {picked > 0 ? (
        <View testID="place-search-scene-picked" accessible style={styles.marker} />
      ) : null}
    </>
  );
}

export function BountyBoardScene({ onReady }: { onReady: () => void }) {
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
  return (
    <>
      <ScrollView
        ref={scroll}
        innerViewRef={content as RefObject<View>}
        testID="bounty-board-scene"
        contentInsetAdjustmentBehavior="automatic"
        style={styles.screen}
        contentContainerStyle={styles.content}
        scrollEventThrottle={16}
        {...board.scrollHandlers}
        refreshControl={<RefreshControl refreshing={board.pulling} onRefresh={board.pull} />}
      >
        <BountyBoard
          board={board}
          onPost={() => setLeft('post')}
          onOpen={(id) => setLeft(`open-${id}`)}
          onApply={(id) => setLeft(`apply-${id}`)}
          onPickPlace={() => setLeft('pick-place')}
        />
      </ScrollView>
      <Marker name={left} />
    </>
  );
}

export function BountyDetailScene({ onReady }: { onReady: () => void }) {
  const [left, setLeft] = useState<string | null>(null);
  useEffect(onReady, [onReady]);
  return (
    <>
      <BountyDetailScreen
        id={uiVerifyArgument('uiVerifyDetailId') ?? 'fixture-bounty-01'}
        userId={fixtureUser('apple').id}
        onApply={(id) => setLeft(`apply-${id}`)}
        onGone={() => setLeft('gone')}
      />
      <Marker name={left} />
    </>
  );
}

const styles = StyleSheet.create({
  marker: { position: 'absolute', width: 1, height: 1 },
  screen: { flex: 1, backgroundColor: PlatformColor('systemGroupedBackground') },
  content: { paddingHorizontal: vars['--space-4'], paddingBottom: vars['--space-7'] },
});

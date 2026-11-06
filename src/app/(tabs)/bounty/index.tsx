import { Stack, useIsFocused, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState, type RefObject } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  RefreshControl,
  type ViewInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TitleHalo } from 'tapiro-kit';

import { useProfile, useSignedInUser, type AccountUser } from '@/features/account';
import {
  BountyBoard,
  boardLink,
  closePostSheet,
  hasPostDraft,
  useBountyBoard,
  usePublishBoard,
  useStartPost,
} from '@/features/bounty';
import { useItemChat } from '@/features/chat';
import { coinsStore, useStageFeed } from '@/features/coins';
import {
  composeStageActor,
  HOME_BOTTOM_CHROME,
  HOME_TOP_CLEAR,
  HomeScreen,
  useHomeScroll,
  useLiveStackState,
} from '@/features/home';
import { PendingReviewCards, reviewStore, useStageGrowth } from '@/features/reputation';
import { useI18n } from '@/lib/i18n';
import { vars } from '@/ui/theme/tokens';

export default function BountyHomeRoute() {
  const user = useSignedInUser();
  return user ? <BountyHome user={user} /> : null;
}

function BountyHome({ user }: { user: AccountUser }) {
  const router = useRouter();
  const { t } = useI18n();
  const focused = useIsFocused();
  const profile = useProfile(user);
  const name =
    (profile.status === 'ready' ? profile.profile?.displayName : null) ?? user.name ?? '';
  const stack = useLiveStackState();
  const [mascotShown, setMascotShown] = useState(true);
  const openGrown = useCallback(() => router.push('/bounty/mascot-grown'), [router]);
  const growthActor = useStageGrowth({
    userId: user.id,
    visible: focused && mascotShown,
    open: openGrown,
  });
  const feedActor = useStageFeed();
  const actor = composeStageActor(growthActor, feedActor);
  const chat = useItemChat(
    useCallback(
      (thread: string) => router.navigate({ pathname: '/messages/[thread]', params: { thread } }),
      [router],
    ),
  );
  const startPost = useStartPost({
    open: () =>
      hasPostDraft(user.id)
        ? router.navigate('/bounty-post/form', { withAnchor: true })
        : router.navigate('/bounty-post'),
    pay: (paymentId) => {
      closePostSheet();
      router.push({ pathname: '/pay/[id]', params: { id: paymentId } });
    },
  });
  const { scrollViewProps, onLiveCardsLayout } = useHomeScroll(() => stack.setOpen(true));
  const insets = useSafeAreaInsets();
  const content = useRef<ViewInstance>(null);
  const board = useBountyBoard(user.id, {
    scroll: scrollViewProps.ref,
    content,
    topInset: insets.top + HOME_TOP_CLEAR + vars['--space-3'],
    bottomInset: insets.bottom + HOME_BOTTOM_CHROME + vars['--space-3'],
  });
  usePublishBoard(board, startPost);
  const homeScroll = {
    ...scrollViewProps,
    innerViewRef: content as RefObject<ViewInstance>,
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollViewProps.onScroll(event);
      board.scrollHandlers.onScroll(event);
    },
    onScrollBeginDrag: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollViewProps.onScrollBeginDrag(event);
      board.scrollHandlers.onScrollBeginDrag();
    },
    onContentSizeChange: board.scrollHandlers.onContentSizeChange,
    onMomentumScrollEnd: board.scrollHandlers.onMomentumScrollEnd,
  };

  return (
    <>
      {focused ? <StatusBar style="dark" /> : null}
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="plus"
          accessibilityLabel={t('bounty.post.open')}
          onPress={startPost}
        />
      </Stack.Toolbar>
      <HomeScreen
        scrollViewProps={homeScroll}
        onLiveCardsLayout={onLiveCardsLayout}
        open={stack.open}
        onToggle={stack.setOpen}
        name={name}
        onAsk={() => router.push({ pathname: '/ask', params: { tab: 'bounty' } })}
        chat={{ open: (bountyId) => chat.open('bounty', bountyId), opening: chat.opening }}
        actor={actor}
        onMascotShown={setMascotShown}
        reviews={<PendingReviewCards />}
        board={
          <BountyBoard
            board={board}
            onPost={startPost}
            onOpen={(id) => router.push({ pathname: '/bounty/[id]', params: { id } })}
            onApply={(id) =>
              router.push({ pathname: '/bounty-apply/[id]', params: { id, from: 'card' } })
            }
            onPickPlace={() => router.push('/bounty/place')}
            onExpandMap={(camera) => {
              boardLink.expandFrom(camera);
              router.push('/bounty-map');
            }}
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={board.pulling}
            onRefresh={() => {
              void reviewStore.reloadPending();
              void coinsStore.reloadFeedStatus();
              board.pull();
            }}
          />
        }
      />
      <TitleHalo />
    </>
  );
}

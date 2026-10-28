import { Stack, useIsFocused, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { RefreshControl, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { TitleHalo } from 'tapiro-kit';

import { useProfile, useSignedInUser, type AccountUser } from '@/features/account';
import { BountyBoard, closePostSheet, useBountyBoard, useStartPost } from '@/features/bounty';
import { HomeScreen, useHomeScroll, useLiveStackState } from '@/features/home';
import { useI18n } from '@/lib/i18n';

const openBounty = (_id: string) => {};
const applyTo = (_id: string) => {};

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
  const startPost = useStartPost({
    open: () => router.navigate('/bounty-post'),
    pay: (paymentId) => {
      closePostSheet();
      router.push({ pathname: '/pay/[id]', params: { id: paymentId } });
    },
  });
  const { scrollViewProps, onLiveCardsLayout } = useHomeScroll(() => stack.setOpen(true));
  const board = useBountyBoard(user.id);
  const homeScroll = {
    ...scrollViewProps,
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollViewProps.onScroll(event);
      board.paging.onScroll(event);
    },
    onContentSizeChange: board.paging.onContentSizeChange,
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
        board={
          <BountyBoard board={board} onPost={startPost} onOpen={openBounty} onApply={applyTo} />
        }
        refreshControl={<RefreshControl refreshing={board.pulling} onRefresh={board.pull} />}
      />
      <TitleHalo />
    </>
  );
}

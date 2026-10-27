import { Stack, useIsFocused, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TitleHalo } from 'tapiro-kit';

import { useProfile, useSignedInUser } from '@/features/account';
import { useStartPost } from '@/features/bounty';
import { HomeScreen, useHomeScroll, useLiveStackState } from '@/features/home';
import { useI18n } from '@/lib/i18n';

export default function BountyHome() {
  const router = useRouter();
  const { t } = useI18n();
  const focused = useIsFocused();
  const user = useSignedInUser();
  const profile = useProfile(user);
  const name =
    (profile.status === 'ready' ? profile.profile?.displayName : null) ?? user?.name ?? '';
  const stack = useLiveStackState();
  const startPost = useStartPost({
    open: () => router.push('/bounty-post'),
    pay: (paymentId) => {
      router.back();
      router.push({ pathname: '/pay/[id]', params: { id: paymentId } });
    },
  });
  const { scrollViewProps, onLiveCardsLayout } = useHomeScroll(() => stack.setOpen(true));

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
        scrollViewProps={scrollViewProps}
        onLiveCardsLayout={onLiveCardsLayout}
        open={stack.open}
        onToggle={stack.setOpen}
        name={name}
        onAsk={() => router.push({ pathname: '/ask', params: { tab: 'bounty' } })}
      />
      <TitleHalo />
    </>
  );
}

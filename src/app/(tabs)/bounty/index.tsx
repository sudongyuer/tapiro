import { useIsFocused, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TitleHalo } from 'tapiro-kit';

import { useProfile, useSignedInUser } from '@/features/account';
import { HomeScreen, useLiveStackState } from '@/features/home';
import { useHomeScroll } from '@/features/shell';

export default function BountyHome() {
  const router = useRouter();
  const focused = useIsFocused();
  const user = useSignedInUser();
  const profile = useProfile(user);
  const name =
    (profile.status === 'ready' ? profile.profile?.displayName : null) ?? user?.name ?? '';
  const stack = useLiveStackState();
  const { scrollViewProps, onLiveCardsLayout } = useHomeScroll(() => stack.setOpen(true));

  return (
    <>
      {focused ? <StatusBar style="dark" /> : null}
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

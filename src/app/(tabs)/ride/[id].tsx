import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';

import { useSignedInUser } from '@/features/account';
import { useItemChat } from '@/features/chat';
import { useSettleCelebration } from '@/features/payment';
import { RideDetailScreen } from '@/features/ride';
import { profileHref, ReviewEntryCard, reviewStore } from '@/features/reputation';

export default function RideDetailRoute() {
  const router = useRouter();
  const user = useSignedInUser();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = user?.id ?? '';
  const openBook = () => router.navigate('/me/stickers');
  const celebration = useSettleCelebration(userId, openBook);
  const { settled } = celebration;
  const chat = useItemChat(
    useCallback(
      (thread: string) => router.navigate({ pathname: '/messages/[thread]', params: { thread } }),
      [router],
    ),
  );
  const bridge = useMemo(
    () => ({
      pay: (paymentId: string) => router.push({ pathname: '/pay/[id]', params: { id: paymentId } }),
      openPayment: (paymentId: string) =>
        router.push({ pathname: '/pay/[id]', params: { id: paymentId } }),
      received: settled,
      openStickerBook: () => router.navigate('/me/stickers'),
    }),
    [router, settled],
  );
  if (!user || !id) return null;
  return (
    <>
      <RideDetailScreen
        id={id}
        userId={user.id}
        onGone={() => router.back()}
        settle={bridge}
        message={{ onPress: () => chat.open('ride', id), busy: chat.opening === id }}
        onOpenProfile={(person) => router.push(profileHref('ride', person))}
        onPull={() => void reviewStore.reloadItem('ride', id)}
        reviews={(title) => <ReviewEntryCard kind="ride" itemId={id} title={title} />}
      />
      {celebration.element}
    </>
  );
}

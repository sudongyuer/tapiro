import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';

import { useSignedInUser } from '@/features/account';
import { useReceiptReader } from '@/features/ask';
import { useItemChat } from '@/features/chat';
import { useSettleCelebration } from '@/features/payment';
import { RideDetailScreen } from '@/features/ride';
import { profileHref, ReviewEntryCard, reviewStore } from '@/features/reputation';
import { useAiOffered } from '@/lib/storefront';

export default function RideDetail() {
  return <RideDetailRoute overTabs={false} />;
}

export function RideDetailRoute({ overTabs }: { overTabs: boolean }) {
  const router = useRouter();
  const user = useSignedInUser();
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const userId = user?.id ?? '';
  const openBook = useCallback(() => router.push('/sticker-book'), [router]);
  const celebration = useSettleCelebration(userId, openBook);
  const reader = useReceiptReader(useAiOffered() && user ? user.id : null);
  const receipts = useMemo(
    () =>
      reader && {
        reader,
        openConsent: () => router.push({ pathname: '/ask-consent', params: { from: 'ride' } }),
      },
    [reader, router],
  );
  const { settled } = celebration;
  const chat = useItemChat(
    useCallback(
      (thread: string) =>
        from === 'thread'
          ? router.back()
          : router.push({ pathname: '/chat/[thread]', params: { thread, from: 'item' } }),
      [router, from],
    ),
  );
  const bridge = useMemo(
    () => ({
      pay: (paymentId: string) => router.push({ pathname: '/pay/[id]', params: { id: paymentId } }),
      openPayment: (paymentId: string) =>
        router.push({ pathname: '/pay/[id]', params: { id: paymentId } }),
      received: settled,
      openStickerBook: openBook,
    }),
    [router, settled, openBook],
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
        onOpenProfile={(person) => router.push(profileHref(overTabs ? 'overTabs' : 'ride', person))}
        onPull={() => void reviewStore.pullItem('ride', id)}
        reviews={(title) => <ReviewEntryCard kind="ride" itemId={id} title={title} />}
        receipts={receipts}
      />
      {celebration.element}
    </>
  );
}

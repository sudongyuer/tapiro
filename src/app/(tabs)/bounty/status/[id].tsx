import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { StatusScreen } from '@/features/bounty';
import { useItemChat } from '@/features/chat';
import { ReviewEntriesSection, reviewStore } from '@/features/reputation';

export default function BountyStatusRoute() {
  const router = useRouter();
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const chat = useItemChat(
    useCallback(
      (thread: string) =>
        from === 'thread'
          ? router.back()
          : router.push({ pathname: '/chat/[thread]', params: { thread, from: 'item' } }),
      [router, from],
    ),
  );
  if (!id) return null;
  return (
    <StatusScreen
      id={id}
      onBack={() => router.back()}
      onPay={(paymentId) => router.push({ pathname: '/pay/[id]', params: { id: paymentId } })}
      message={{ onPress: () => chat.open('bounty', id), busy: chat.opening === id }}
      onPull={() => void reviewStore.pullItem('bounty', id)}
      reviews={(title) => <ReviewEntriesSection kind="bounty" itemId={id} title={title} />}
    />
  );
}

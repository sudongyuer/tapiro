import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';

import { useSignedInUser } from '@/features/account';
import { useSettleCelebration } from '@/features/payment';
import { RideDetailScreen } from '@/features/ride';

export default function RideDetailRoute() {
  const router = useRouter();
  const user = useSignedInUser();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = user?.id ?? '';
  const openBook = () => router.navigate('/me/stickers');
  const celebration = useSettleCelebration(userId, openBook);
  const { settled } = celebration;
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
      <RideDetailScreen id={id} userId={user.id} onGone={() => router.back()} settle={bridge} />
      {celebration.element}
    </>
  );
}

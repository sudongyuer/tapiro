import { useLocalSearchParams, useRouter } from 'expo-router';

import { StatusScreen } from '@/features/bounty';

export default function BountyStatusRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;
  return (
    <StatusScreen
      id={id}
      onBack={() => router.back()}
      onPay={(paymentId) => router.push({ pathname: '/pay/[id]', params: { id: paymentId } })}
    />
  );
}

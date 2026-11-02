import { useLocalSearchParams, useRouter } from 'expo-router';

import { useSignedInUser } from '@/features/account';
import { RideDetailScreen } from '@/features/ride';

export default function RideDetailRoute() {
  const router = useRouter();
  const user = useSignedInUser();
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!user || !id) return null;
  return <RideDetailScreen id={id} userId={user.id} onGone={() => router.back()} />;
}

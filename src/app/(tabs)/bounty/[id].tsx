import { useLocalSearchParams, useRouter } from 'expo-router';

import { useSignedInUser } from '@/features/account';
import { BountyDetailScreen } from '@/features/bounty';

const applyTo = (_id: string) => {};

export default function BountyDetailRoute() {
  const router = useRouter();
  const user = useSignedInUser();
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!user || !id) return null;
  return (
    <BountyDetailScreen id={id} userId={user.id} onApply={applyTo} onGone={() => router.back()} />
  );
}

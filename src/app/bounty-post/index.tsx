import { useRouter } from 'expo-router';

import { useSignedInUser } from '@/features/account';
import { closePostSheet, PostPick } from '@/features/bounty';

export default function BountyPostPickRoute() {
  const router = useRouter();
  const user = useSignedInUser();
  if (!user) return null;
  return (
    <PostPick
      userId={user.id}
      onPicked={() => router.push('/bounty-post/form')}
      onClose={closePostSheet}
    />
  );
}

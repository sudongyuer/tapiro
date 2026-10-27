import { useRouter } from 'expo-router';

import { useSignedInUser } from '@/features/account';
import { closePostSheet, PostForm } from '@/features/bounty';

export default function BountyPostFormRoute() {
  const router = useRouter();
  const user = useSignedInUser();
  if (!user) return null;
  return (
    <PostForm
      userId={user.id}
      onNext={() => router.navigate('/bounty-post/confirm')}
      onClose={closePostSheet}
      onPickPlace={() => router.push('/bounty-post/place')}
    />
  );
}

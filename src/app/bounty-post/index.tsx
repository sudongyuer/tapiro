import { useNavigation, useRouter } from 'expo-router';

import { useSignedInUser } from '@/features/account';
import { PostForm } from '@/features/bounty';

export default function BountyPostFormRoute() {
  const router = useRouter();
  const navigation = useNavigation();
  const user = useSignedInUser();
  if (!user) return null;
  return (
    <PostForm
      userId={user.id}
      onNext={() => router.push('/bounty-post/confirm')}
      onClose={() => navigation.getParent()?.goBack()}
    />
  );
}

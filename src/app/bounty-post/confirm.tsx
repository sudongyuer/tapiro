import { useRouter } from 'expo-router';

import { useSignedInUser } from '@/features/account';
import { closePostSheet, PostConfirm } from '@/features/bounty';

export default function BountyPostConfirmRoute() {
  const router = useRouter();
  const user = useSignedInUser();
  if (!user) return null;
  return (
    <PostConfirm
      userId={user.id}
      onPublished={closePostSheet}
      onPay={(paymentId) => {
        closePostSheet();
        router.push({ pathname: '/pay/[id]', params: { id: paymentId } });
      }}
      onBack={() => router.back()}
    />
  );
}

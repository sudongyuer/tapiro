import { useNavigation, useRouter } from 'expo-router';

import { useSignedInUser } from '@/features/account';
import { PostConfirm } from '@/features/bounty';

export default function BountyPostConfirmRoute() {
  const router = useRouter();
  const navigation = useNavigation();
  const user = useSignedInUser();
  if (!user) return null;
  const close = () => navigation.getParent()?.goBack();
  return (
    <PostConfirm
      userId={user.id}
      onPublished={close}
      onPay={(paymentId) => {
        close();
        router.push({ pathname: '/pay/[id]', params: { id: paymentId } });
      }}
      onBack={() => router.back()}
    />
  );
}

import { useLocalSearchParams, useRouter } from 'expo-router';

import { useSignedInUser } from '@/features/account';
import { PaySheet } from '@/features/payment';

export default function PayRoute() {
  const router = useRouter();
  const user = useSignedInUser();
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!user || !id) return null;
  return <PaySheet userId={user.id} paymentId={id} onClose={() => router.back()} />;
}

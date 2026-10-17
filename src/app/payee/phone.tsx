import { useLocalSearchParams, useRouter } from 'expo-router';

import { useSignedInUser } from '@/features/account';
import { PhoneSheet } from '@/features/payee';

export default function PayeePhoneSheet() {
  const router = useRouter();
  const user = useSignedInUser();
  const { id } = useLocalSearchParams<{ id?: string }>();
  if (!user) return null;
  return <PhoneSheet userId={user.id} methodId={id} onDone={() => router.back()} />;
}

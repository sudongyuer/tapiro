import { useLocalSearchParams, useRouter } from 'expo-router';

import { useSignedInUser } from '@/features/account';
import { BankSheet } from '@/features/payee';

export default function PayeeBankSheet() {
  const router = useRouter();
  const user = useSignedInUser();
  const { id } = useLocalSearchParams<{ id?: string }>();
  if (!user) return null;
  return <BankSheet userId={user.id} methodId={id} onDone={() => router.back()} />;
}

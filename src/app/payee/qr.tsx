import { useLocalSearchParams, useRouter } from 'expo-router';

import { useSignedInUser } from '@/features/account';
import { QrSheet } from '@/features/payee';

export default function PayeeQrSheet() {
  const router = useRouter();
  const user = useSignedInUser();
  const { id, repick } = useLocalSearchParams<{ id?: string; repick?: string }>();
  if (!user) return null;
  return (
    <QrSheet userId={user.id} methodId={id} repick={repick === '1'} onDone={() => router.back()} />
  );
}

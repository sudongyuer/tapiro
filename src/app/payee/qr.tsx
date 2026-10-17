import { useLocalSearchParams, useRouter } from 'expo-router';

import { useSignedInUser } from '@/features/account';
import { isQrWallet, QrSheet } from '@/features/payee';

export default function PayeeQrSheet() {
  const router = useRouter();
  const user = useSignedInUser();
  const { id, repick, wallet } = useLocalSearchParams<{
    id?: string;
    repick?: string;
    wallet?: string;
  }>();
  if (!user) return null;
  return (
    <QrSheet
      userId={user.id}
      methodId={id}
      repick={repick === '1'}
      wallet={isQrWallet(wallet) ? wallet : undefined}
      onDone={() => router.back()}
    />
  );
}

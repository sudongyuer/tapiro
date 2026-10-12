import { useRouter } from 'expo-router';

import { DeleteAccountSheet, accountActions } from '@/features/account';

export default function DeleteAccount() {
  const router = useRouter();
  return (
    <DeleteAccountSheet onDelete={accountActions.deleteAccount} onCancel={() => router.back()} />
  );
}

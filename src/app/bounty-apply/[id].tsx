import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { ApplySheet } from '@/features/bounty';

export default function BountyApplyRoute() {
  const router = useRouter();
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const close = useCallback(() => router.back(), [router]);
  if (!id) return null;
  return (
    <ApplySheet
      id={id}
      surface={from === 'detail' ? 'detail' : 'card'}
      onClose={close}
      onAddPayee={() => {
        router.back();
        router.navigate('/me/payee');
      }}
    />
  );
}

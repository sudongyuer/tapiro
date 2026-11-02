import { useRouter } from 'expo-router';

import { useSignedInUser } from '@/features/account';
import { closeRideSheet, RideConfirm } from '@/features/ride';

export default function RideCreateConfirmRoute() {
  const router = useRouter();
  const user = useSignedInUser();
  if (!user) return null;
  return (
    <RideConfirm
      userId={user.id}
      onPublished={closeRideSheet}
      onAddPayee={() => {
        closeRideSheet();
        router.navigate('/me/payee');
      }}
      onBack={() => router.back()}
    />
  );
}

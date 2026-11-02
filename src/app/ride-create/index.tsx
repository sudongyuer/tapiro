import { useRouter } from 'expo-router';

import { useSignedInUser } from '@/features/account';
import { closeRideSheet, RidePick } from '@/features/ride';

export default function RideCreatePickRoute() {
  const router = useRouter();
  const user = useSignedInUser();
  if (!user) return null;
  return (
    <RidePick
      userId={user.id}
      onPicked={() => router.push('/ride-create/form')}
      onClose={closeRideSheet}
    />
  );
}

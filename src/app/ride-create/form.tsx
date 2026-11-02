import { useRouter } from 'expo-router';

import { useSignedInUser } from '@/features/account';
import { RideForm } from '@/features/ride';

export default function RideCreateFormRoute() {
  const router = useRouter();
  const user = useSignedInUser();
  if (!user) return null;
  return (
    <RideForm
      userId={user.id}
      onNext={() => router.navigate('/ride-create/confirm')}
      onPickPlace={(which) => router.push({ pathname: '/ride-create/place', params: { which } })}
    />
  );
}

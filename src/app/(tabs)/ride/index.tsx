import { useRouter } from 'expo-router';

import { useSignedInUser } from '@/features/account';
import { hasRideDraft, RideListScreen } from '@/features/ride';

export default function RideRoute() {
  const router = useRouter();
  const user = useSignedInUser();
  if (!user) return null;
  return (
    <RideListScreen
      onAdd={() =>
        hasRideDraft(user.id)
          ? router.navigate('/ride-create/form', { withAnchor: true })
          : router.navigate('/ride-create')
      }
      onOpen={(id) => router.push({ pathname: '/ride/[id]', params: { id } })}
      onHistory={() => router.push('/ride/history')}
    />
  );
}

import { useRouter } from 'expo-router';

import { RideHistoryScreen } from '@/features/ride';

export default function RideHistoryRoute() {
  const router = useRouter();
  return (
    <RideHistoryScreen onOpen={(id) => router.push({ pathname: '/ride/[id]', params: { id } })} />
  );
}

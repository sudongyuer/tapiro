import { useLocalSearchParams } from 'expo-router';

import { RideDetailStub } from '@/features/ride';

export default function RideDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return id ? <RideDetailStub id={id} /> : null;
}

import { useRouter } from 'expo-router';

import { PlaceSearchScreen } from '@/features/bounty';

export default function BountyPlaceRoute() {
  const router = useRouter();
  return <PlaceSearchScreen purpose="board" onPicked={() => router.back()} />;
}

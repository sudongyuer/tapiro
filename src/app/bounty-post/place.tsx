import { useRouter } from 'expo-router';

import { PlaceSearchScreen } from '@/features/bounty';

export default function BountyPostPlaceRoute() {
  const router = useRouter();
  return <PlaceSearchScreen purpose="post" onPicked={() => router.back()} />;
}

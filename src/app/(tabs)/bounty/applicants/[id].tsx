import { useLocalSearchParams, useRouter } from 'expo-router';

import { ApplicantsScreen } from '@/features/bounty';

export default function BountyApplicantsRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;
  return (
    <ApplicantsScreen
      id={id}
      onBack={() => router.back()}
      onProgress={() => router.push({ pathname: '/bounty/status/[id]', params: { id } })}
    />
  );
}

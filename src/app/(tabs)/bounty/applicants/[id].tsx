import { useLocalSearchParams, useRouter } from 'expo-router';

import { ApplicantsScreen } from '@/features/bounty';
import { profileHref } from '@/features/reputation';

export default function BountyApplicantsRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;
  return (
    <ApplicantsScreen
      id={id}
      onBack={() => router.back()}
      onProgress={() => router.push({ pathname: '/bounty/status/[id]', params: { id } })}
      onOpenProfile={(person) => router.push(profileHref('bounty', person))}
    />
  );
}

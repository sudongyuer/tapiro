import { useLocalSearchParams, useRouter } from 'expo-router';

import { useSignedInUser } from '@/features/account';
import { BountyDetailScreen } from '@/features/bounty';
import { profileHref } from '@/features/reputation';
import { homeSignals } from '@/lib/homeSignals';

export default function BountyDetailRoute() {
  const router = useRouter();
  const user = useSignedInUser();
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!user || !id) return null;
  return (
    <BountyDetailScreen
      id={id}
      userId={user.id}
      onApply={(bounty) =>
        router.push({ pathname: '/bounty-apply/[id]', params: { id: bounty, from: 'detail' } })
      }
      onGone={() => router.back()}
      onBlocked={() => router.back()}
      onProgress={(bounty) =>
        router.push({ pathname: '/bounty/status/[id]', params: { id: bounty } })
      }
      onOpenProfile={(person) => router.push(profileHref('bounty', person))}
      onBrowse={() => {
        homeSignals.requestTop();
        router.dismissTo('/bounty');
      }}
    />
  );
}

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { useSignedInUser } from '@/features/account';
import { BountyDetailScreen } from '@/features/bounty';
import { profileHref } from '@/features/reputation';
import { homeSignals } from '@/lib/homeSignals';

export default function BountyDetailRoute() {
  const router = useRouter();
  const user = useSignedInUser();
  const { id, notice } = useLocalSearchParams<{ id: string; notice?: string }>();
  const toApplicants = useCallback(
    () => id && router.replace({ pathname: '/bounty/applicants/[id]', params: { id } }),
    [router, id],
  );
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
      onApplicants={(bounty) =>
        router.push({ pathname: '/bounty/applicants/[id]', params: { id: bounty } })
      }
      onPosterLoaded={notice === 'expired' ? toApplicants : undefined}
      onOpenProfile={(person) => router.push(profileHref('bounty', person))}
      onBrowse={() => {
        homeSignals.requestTop();
        router.dismissTo('/bounty');
      }}
    />
  );
}

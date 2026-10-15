import { useRouter } from 'expo-router';

import { MeView, useProfile, useSignedInUser } from '@/features/account';
import { usePayeeRecheckDue } from '@/features/payee';

export default function Me() {
  const router = useRouter();
  const user = useSignedInUser();
  const profile = useProfile(user);
  const ready = profile.status === 'ready' ? profile.profile : null;
  const payeeDue = usePayeeRecheckDue(user?.id ?? null);
  return (
    <MeView
      name={ready?.displayName ?? user?.name ?? ''}
      avatarUrl={ready?.avatarUrl ?? user?.avatarUrl ?? null}
      payeeDue={payeeDue}
      onOpenPayee={() => router.push('/me/payee')}
      onOpenSettings={() => router.push('/me/settings')}
    />
  );
}

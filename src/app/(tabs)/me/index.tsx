import { useRouter } from 'expo-router';

import { MeView, useProfile, useSignedInUser } from '@/features/account';

export default function Me() {
  const router = useRouter();
  const user = useSignedInUser();
  const profile = useProfile(user);
  const ready = profile.status === 'ready' ? profile.profile : null;
  return (
    <MeView
      name={ready?.displayName ?? user?.name ?? ''}
      avatarUrl={ready?.avatarUrl ?? user?.avatarUrl ?? null}
      onOpenSettings={() => router.push('/me/settings')}
    />
  );
}

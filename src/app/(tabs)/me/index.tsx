import { useRouter } from 'expo-router';

import { MeView, useProfile, useSignedInUser } from '@/features/account';

export default function Me() {
  const router = useRouter();
  const user = useSignedInUser();
  const profile = useProfile(user);
  const name = (profile.status === 'ready' ? profile.profile?.displayName : null) ?? user?.name;
  return <MeView name={name ?? ''} onOpenSettings={() => router.push('/me/settings')} />;
}

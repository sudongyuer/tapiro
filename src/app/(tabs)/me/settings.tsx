import { useRouter } from 'expo-router';

import { SettingsView, accountActions, useProfile, useSignedInUser } from '@/features/account';

export default function Settings() {
  const router = useRouter();
  const user = useSignedInUser();
  const profile = useProfile(user);
  const name = (profile.status === 'ready' ? profile.profile?.displayName : null) ?? user?.name;
  return (
    <SettingsView
      name={name ?? ''}
      email={user?.email ?? null}
      onSignOut={accountActions.signOut}
      onDeleteAccount={() => router.push('/delete-account')}
    />
  );
}

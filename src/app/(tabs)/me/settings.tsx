import { useRouter } from 'expo-router';

import {
  SettingsView,
  accountActions,
  useProfile,
  useSignedInUser,
  useSigningOut,
} from '@/features/account';
import { icpFiling } from '@/lib/icpFiling';
import { useChinaStorefront } from '@/lib/storefront';

export default function Settings() {
  const router = useRouter();
  const chinaStorefront = useChinaStorefront();
  const user = useSignedInUser();
  const profile = useProfile(user);
  const signingOut = useSigningOut();
  const ready = profile.status === 'ready' ? profile.profile : null;
  return (
    <SettingsView
      name={ready?.displayName ?? user?.name ?? ''}
      email={user?.email ?? null}
      avatarUrl={ready?.avatarUrl ?? user?.avatarUrl ?? null}
      signingOut={signingOut}
      onSignOut={() => void accountActions.signOut()}
      onDeleteAccount={() => router.push('/delete-account')}
      onOpenLegal={(page) => router.push(`/legal/${page}`)}
      icpFiling={icpFiling}
      chinaStorefront={chinaStorefront}
    />
  );
}

import { useEffect, useSyncExternalStore } from 'react';

import { accountStage } from './accountStage';
import { onboardingStore, profileStore } from './services';
import type { AccountUser } from './types';
import { useSession } from './useSession';

export function useAccountStage() {
  const session = useSession();
  const onboarded = useSyncExternalStore(onboardingStore.subscribe, onboardingStore.getSnapshot);
  return accountStage(session, onboarded);
}

export function useSignedInUser(): AccountUser | null {
  const session = useSession();
  return session.status === 'signedIn' ? session.user : null;
}

export function useProfile(user: AccountUser | null) {
  const state = useSyncExternalStore(profileStore.subscribe, profileStore.getSnapshot);
  useEffect(() => {
    if (user) profileStore.ensureLoaded(user);
  }, [user]);
  if (!user || state.status === 'idle' || state.userId !== user.id)
    return { status: 'loading' } as const;
  return state;
}

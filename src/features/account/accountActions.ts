import type { UserCleanups } from '@/lib/userCleanups';

import type { OnboardingStore } from './onboardingStore';
import type { ProfileStore } from './profileStore';
import type { AuthService, DeleteAccountResult } from './types';

const SIGN_OUT_WAIT_MS = 3_000;

async function bounded(task: Promise<void>, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, ms);
  });
  await Promise.race([task.catch(() => undefined), timeout]);
  clearTimeout(timer);
}

export function createAccountActions({
  auth,
  onboarding,
  profiles,
  cleanups,
  beforeSignOut = async () => undefined,
}: {
  auth: AuthService;
  onboarding: OnboardingStore;
  profiles: ProfileStore;
  cleanups: Pick<UserCleanups, 'run'>;
  beforeSignOut?: () => Promise<void>;
}) {
  return {
    finishOnboarding(userId: string) {
      onboarding.markDone(userId);
    },

    async signOut() {
      await bounded(beforeSignOut(), SIGN_OUT_WAIT_MS);
      return auth.signOut();
    },

    async deleteAccount(): Promise<DeleteAccountResult> {
      const state = auth.getState();
      const result = await auth
        .deleteAccount()
        .catch((): DeleteAccountResult => ({ ok: false, reason: 'failed' }));
      if (result.ok && state.status === 'signedIn') {
        onboarding.clear(state.user.id);
        profiles.forget(state.user.id);
        cleanups.run(state.user.id);
      }
      return result;
    },
  };
}

export type AccountActions = ReturnType<typeof createAccountActions>;

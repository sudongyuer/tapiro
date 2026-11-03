import { createStore } from '@/lib/store';
import type { UserCleanups } from '@/lib/userCleanups';

import type { OnboardingStore } from './onboardingStore';
import type { ProfileStore } from './profileStore';
import type { AuthService, DeleteAccountResult } from './types';

export const SIGN_OUT_WAIT_MS = 3_000;

type Timers = { set: (run: () => void, ms: number) => unknown; clear: (handle: unknown) => void };

const SYSTEM_TIMERS: Timers = {
  set: (run, ms) => setTimeout(run, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

async function bounded(task: Promise<void>, ms: number, timers: Timers) {
  let timer: unknown = null;
  const timeout = new Promise<void>((resolve) => {
    timer = timers.set(resolve, ms);
  });
  await Promise.race([task.catch(() => undefined), timeout]);
  timers.clear(timer);
}

export function createAccountActions({
  auth,
  onboarding,
  profiles,
  cleanups,
  beforeSignOut = async () => undefined,
  timers = SYSTEM_TIMERS,
}: {
  auth: AuthService;
  onboarding: OnboardingStore;
  profiles: ProfileStore;
  cleanups: Pick<UserCleanups, 'run'>;
  beforeSignOut?: () => Promise<void>;
  timers?: Timers;
}) {
  const signingOut = createStore(false);
  return {
    signingOut,

    finishOnboarding(userId: string) {
      onboarding.markDone(userId);
    },

    async signOut() {
      if (signingOut.get()) return;
      signingOut.set(true);
      try {
        await bounded(beforeSignOut(), SIGN_OUT_WAIT_MS, timers);
        await auth.signOut();
      } finally {
        signingOut.set(false);
      }
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

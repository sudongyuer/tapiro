import type { OnboardingStore } from './onboardingStore';
import type { ProfileStore } from './profileStore';
import type { AuthService, DeleteAccountResult } from './types';

export function createAccountActions({
  auth,
  onboarding,
  profiles,
}: {
  auth: AuthService;
  onboarding: OnboardingStore;
  profiles: ProfileStore;
}) {
  return {
    finishOnboarding(userId: string) {
      onboarding.markDone(userId);
    },

    signOut() {
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
      }
      return result;
    },
  };
}

export type AccountActions = ReturnType<typeof createAccountActions>;

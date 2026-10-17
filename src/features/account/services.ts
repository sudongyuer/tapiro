import { getSupabase } from '@/lib/supabase';
import { uiVerify, uiVerifyFixture, uiVerifySignedIn } from '@/lib/uiVerify';

import { createAccountActions } from './accountActions';
import { authService } from './authService';
import { fixtureUser } from './fixtureAuthService';
import { settingsOnboardedStorage } from './onboardedStorage';
import { createOnboardingStore, memoryOnboardedStorage } from './onboardingStore';
import { createFixtureProfileService, createSupabaseProfileService } from './profileService';
import { createProfileStore } from './profileStore';

export const onboardingStore = createOnboardingStore(
  uiVerify
    ? memoryOnboardedStorage(
        uiVerifySignedIn?.onboarded ? [fixtureUser('apple', uiVerifyFixture).id] : [],
      )
    : settingsOnboardedStorage,
);

export const profileStore = createProfileStore(
  uiVerify ? createFixtureProfileService() : createSupabaseProfileService(getSupabase()),
);

export const accountActions = createAccountActions({
  auth: authService,
  onboarding: onboardingStore,
  profiles: profileStore,
});

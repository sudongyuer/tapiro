import { getSupabase } from '@/lib/supabase';
import { uiVerify, uiVerifyArgument, uiVerifyFixture, uiVerifySignedIn } from '@/lib/uiVerify';

import { createFixtureAuthService, fixtureDeletion } from './fixtureAuthService';
import { providerAdapters } from './providers';
import { createSupabaseAuthService } from './supabaseAuthService';
import type { AuthService } from './types';

export const authService: AuthService = uiVerify
  ? createFixtureAuthService({
      variant: uiVerifyFixture,
      signedInAs: uiVerifySignedIn ? 'apple' : undefined,
      deletion: fixtureDeletion(uiVerifyArgument('uiVerifyDeletion')),
    })
  : createSupabaseAuthService(getSupabase(), providerAdapters);

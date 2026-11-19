import { getSupabase } from '@/lib/supabase';
import { uiVerify, uiVerifyArgument, uiVerifyFixture, uiVerifySignedIn } from '@/lib/uiVerify';

import { createFixtureAuthService, fixtureDeletion } from './fixtureAuthService';
import { createProviderAdapters } from './providers';
import { createSupabaseAuthService } from './supabaseAuthService';
import { AUTH_PROVIDERS, type AuthService } from './types';

export const authService: AuthService = uiVerify
  ? createFixtureAuthService({
      variant: uiVerifyFixture,
      signedInAs: uiVerifySignedIn ? 'apple' : undefined,
      deletion: fixtureDeletion(uiVerifyArgument('uiVerifyDeletion')),
      providers: fixtureProviders(uiVerifyArgument('uiVerifyProviders')),
    })
  : createSupabaseAuthService(getSupabase(), createProviderAdapters());

function fixtureProviders(value: string | undefined) {
  const picked = AUTH_PROVIDERS.filter((provider) => value?.split(',').includes(provider));
  return picked.length > 0 ? picked : AUTH_PROVIDERS;
}

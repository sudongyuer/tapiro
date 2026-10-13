import { getSupabase } from '@/lib/supabase';
import { uiVerify } from '@/lib/uiVerify';

import { createFixtureAuthService } from './fixtureAuthService';
import { providerAdapters } from './providers';
import { createSupabaseAuthService } from './supabaseAuthService';
import type { AuthService } from './types';

export const authService: AuthService = uiVerify
  ? createFixtureAuthService()
  : createSupabaseAuthService(getSupabase(), providerAdapters);

import { randomUUID } from 'expo-crypto';

import { getSupabase } from '@/lib/supabase';
import { uiVerify, uiVerifyArgument, uiVerifyFixture } from '@/lib/uiVerify';

import { createFixturePostService, fixturePostOptions } from './fixturePostService';
import { createSupabasePostService } from './postService';
import type { PostService } from './types';

export const postService: PostService = uiVerify
  ? createFixturePostService(fixturePostOptions(uiVerifyArgument, uiVerifyFixture))
  : createSupabasePostService(getSupabase());

export function newDraftId() {
  return randomUUID();
}

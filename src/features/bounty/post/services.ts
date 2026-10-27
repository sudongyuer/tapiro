import { getSupabase } from '@/lib/supabase';
import { uiVerify, uiVerifyArgument, uiVerifyFixture } from '@/lib/uiVerify';
import { userCleanups } from '@/lib/userCleanups';

import { newDraftId } from './draftId';
import { settingsDraftStorage } from './draftStorage';
import { createDraftStore } from './draftStore';
import { createFixturePostService, fixturePostOptions } from './fixturePostService';
import { createSupabasePostService } from './postService';
import type { PostService } from './types';

export const postService: PostService = uiVerify
  ? createFixturePostService(fixturePostOptions(uiVerifyArgument, uiVerifyFixture))
  : createSupabasePostService(getSupabase());

export const draftStore = createDraftStore(settingsDraftStorage, newDraftId);

userCleanups.register((userId) => draftStore.clear(userId));

export { newDraftId };

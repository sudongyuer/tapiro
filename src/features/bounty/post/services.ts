import { Settings } from 'react-native';

import { getSupabase } from '@/lib/supabase';
import { uiVerify, uiVerifyArgument, uiVerifyFixture } from '@/lib/uiVerify';
import { userCleanups } from '@/lib/userCleanups';

import { newDraftId } from './draftId';
import { settingsDraftStorage } from './draftStorage';
import { createDraftStore } from './draftStore';
import { createFixturePostService, fixturePostOptions } from './fixturePostService';
import { createSupabasePostService } from './postService';
import type { PostService } from './types';

const PUBLISHED_KEY = 'uiVerifyPublishedArgs';

function verifyPostService() {
  Settings.set({ [PUBLISHED_KEY]: '' });
  return createFixturePostService(fixturePostOptions(uiVerifyArgument, uiVerifyFixture), (args) =>
    Settings.set({ [PUBLISHED_KEY]: JSON.stringify(args) }),
  );
}

export const postService: PostService = uiVerify
  ? verifyPostService()
  : createSupabasePostService(getSupabase());

export const draftStore = createDraftStore(settingsDraftStorage, newDraftId);

userCleanups.register((userId) => draftStore.clear(userId));

export { newDraftId };

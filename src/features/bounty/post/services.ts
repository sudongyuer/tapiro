import { Settings } from 'react-native';

import { deviceCurrency } from '@/lib/deviceCurrency';
import { getSupabase } from '@/lib/supabase';
import { uiVerify, uiVerifyArgument, uiVerifyFixture } from '@/lib/uiVerify';
import { uiVerifyPurchases } from '@/lib/uiVerifyPurchases';
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
  return createFixturePostService(
    fixturePostOptions(uiVerifyArgument, uiVerifyFixture),
    (args) => Settings.set({ [PUBLISHED_KEY]: JSON.stringify(args) }),
    uiVerifyPurchases.coins,
  );
}

export const postService: PostService = uiVerify
  ? verifyPostService()
  : createSupabasePostService(getSupabase());

export const draftStore = createDraftStore(
  settingsDraftStorage,
  newDraftId,
  () => new Date(),
  deviceCurrency,
);

userCleanups.register((userId) => draftStore.clear(userId));

export { newDraftId };

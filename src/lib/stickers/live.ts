import { Settings } from 'react-native';

import { initI18n } from '@/lib/i18n';
import { getSupabase } from '@/lib/supabase';
import { uiVerify, uiVerifyArgument } from '@/lib/uiVerify';
import { liveItems } from '@/lib/useLiveItems';

import { settledItem } from './settled';
import { createFixtureSettledService, settledFixture } from './settledFixture';
import { createSupabaseSettledService } from './settledService';
import { createSettledStore } from './settledStore';

const COLLECTED_KEY = 'uiVerifySettledCollected';

function verifySettledService() {
  Settings.set({ [COLLECTED_KEY]: '' });
  return createFixtureSettledService({
    fixture: settledFixture(uiVerifyArgument('uiVerifySettled')),
    onCollect: (stickerIds) => Settings.set({ [COLLECTED_KEY]: JSON.stringify(stickerIds) }),
  });
}

export const settledStore = createSettledStore(
  uiVerify ? verifySettledService() : createSupabaseSettledService(getSupabase()),
);

export const collect = settledStore.collect;
export const dismissSettled = settledStore.dismiss;

const i18n = initI18n();

function publish() {
  const state = settledStore.getSnapshot();
  if (state.status === 'idle') return liveItems.setSource('stickers', [], 'ready');
  const items = state.rows.map((row) => settledItem(row, i18n.t));
  liveItems.setSource('stickers', items, state.status, settledStore.retry);
}

settledStore.subscribe(publish);
i18n.on('languageChanged', publish);

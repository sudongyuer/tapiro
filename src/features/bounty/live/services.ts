import { Settings } from 'react-native';

import { initI18n } from '@/lib/i18n';
import { getSupabase } from '@/lib/supabase';
import { uiVerify, uiVerifyArgument } from '@/lib/uiVerify';
import { liveItems } from '@/lib/useLiveItems';

import { createFixtureLiveService, fixtureLiveOptions } from './fixtureLiveService';
import { liveBountyItems } from './liveBounties';
import { createSupabaseLiveService } from './liveService';
import { createLiveBountyStore } from './liveStore';

const SEEN_KEY = 'uiVerifyBountySeen';

function verifyLiveService() {
  Settings.set({ [SEEN_KEY]: '' });
  return createFixtureLiveService({
    ...fixtureLiveOptions(uiVerifyArgument),
    onSeen: (calls) => Settings.set({ [SEEN_KEY]: JSON.stringify(calls) }),
  });
}

export const liveBountyStore = createLiveBountyStore(
  uiVerify ? verifyLiveService() : createSupabaseLiveService(getSupabase()),
);

const i18n = initI18n();

function publish() {
  const state = liveBountyStore.getSnapshot();
  if (state.status === 'idle') return liveItems.setSource('bounties', [], 'ready');
  const items = liveBountyItems(state.rows, {
    t: i18n.t,
    language: i18n.language,
    now: new Date(),
    markSeen: liveBountyStore.markSeen,
  });
  liveItems.setSource('bounties', items, state.status, liveBountyStore.retry);
}

liveBountyStore.subscribe(publish);
i18n.on('languageChanged', publish);

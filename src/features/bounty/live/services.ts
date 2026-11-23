import { Settings } from 'react-native';

import { initI18n } from '@/lib/i18n';
import { live } from '@/lib/live';
import { sessionEnds } from '@/lib/sessionEnds';
import { getSupabase } from '@/lib/supabase';
import { uiVerify, uiVerifyArgument } from '@/lib/uiVerify';
import { verifyRecorder } from '@/lib/verifyRecord';
import { liveItems } from '@/lib/useLiveItems';

import { bountyCache } from '../shared/bountyCache';
import { createFixtureLiveService, fixtureLiveOptions } from './fixtureLiveService';
import { liveBountyItems, liveTextChangesAt } from './liveBounties';
import { createSupabaseLiveService } from './liveService';
import { createLiveBountyStore } from './liveStore';
import { reloadOnOwnApplications } from './ownWrites';

const SEEN_KEY = 'uiVerifyBountySeen';

function verifyLiveService() {
  Settings.set({ [SEEN_KEY]: '' });
  return createFixtureLiveService({
    ...fixtureLiveOptions(uiVerifyArgument),
    onSeen: (calls) => Settings.set({ [SEEN_KEY]: JSON.stringify(calls) }),
    onLoaded: (() => {
      const record = verifyRecorder('uiVerifyBountyLiveLoads');
      return () => record('load');
    })(),
  });
}

export const liveBountyStore = createLiveBountyStore(
  uiVerify ? verifyLiveService() : createSupabaseLiveService(getSupabase()),
);

const i18n = initI18n();
let republish: ReturnType<typeof setTimeout> | undefined;

function publish() {
  clearTimeout(republish);
  const state = liveBountyStore.getSnapshot();
  if (state.status === 'idle') return liveItems.setSource('bounties', [], 'ready');
  const now = Date.now();
  const items = liveBountyItems(state.rows, {
    t: i18n.t,
    language: i18n.language,
    now: new Date(now),
    markSeen: liveBountyStore.markSeen,
  });
  liveItems.setSource('bounties', items, state.status, liveBountyStore.retry);
  const at = liveTextChangesAt(state.rows, now);
  if (at !== null) republish = setTimeout(publish, Math.max(0, at - Date.now()));
}

liveBountyStore.subscribe(publish);
export function reloadLiveBounties() {
  const state = liveBountyStore.getSnapshot();
  if (state.status === 'idle') return Promise.resolve();
  return liveBountyStore.reload(state.userId);
}

live.on(['bounty.', 'payment.'], () => void reloadLiveBounties());
reloadOnOwnApplications(bountyCache, () => void reloadLiveBounties());
i18n.on('languageChanged', publish);

sessionEnds.register(() => liveBountyStore.clear());

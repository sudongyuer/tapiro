import { Settings } from 'react-native';

import { addBlockFixturePeople, blockEvents, fixtureBlocked } from '@/features/block';
import { onReturnToForeground, type AppStateSource } from '@/lib/foreground';
import { live } from '@/lib/live';
import { getSupabase } from '@/lib/supabase';
import { uiVerify, uiVerifyArgument } from '@/lib/uiVerify';
import { userCleanups } from '@/lib/userCleanups';

import { createReviewDrafts } from './drafts';
import { FIXTURE_PEOPLE, FIXTURE_REP_USER_ID, repVariant, tierDropVariant } from './fixtureData';
import { createFixtureReputationService, fixtureRepFailPoints } from './fixtureReputationService';
import { createMeStore } from './meStore';
import { createProfileStore } from './profileStore';
import { createSupabaseReputationService } from './reputationService';
import { createReviewStore, REVIEW_SIGNALS } from './reviewStore';

const CALLS_KEY = 'uiVerifyRepCalls';
const DROP_SEEN_KEY = 'uiVerifyTierDropSeen';

function verifyService() {
  Settings.set({ [CALLS_KEY]: '[]' });
  const calls: unknown[] = [];
  addBlockFixturePeople(Object.values(FIXTURE_PEOPLE));
  return createFixtureReputationService({
    isBlocked: fixtureBlocked,
    variant: repVariant(uiVerifyArgument('uiVerifyReviews') ?? uiVerifyArgument('uiVerifyProfile')),
    reviewsOn: uiVerifyArgument('uiVerifyReviews') !== undefined,
    tierDrop: tierDropVariant(uiVerifyArgument('uiVerifyTierDrop')),
    seenDrop: Number(Settings.get(DROP_SEEN_KEY)) || null,
    onDropSeen: (id) => Settings.set({ [DROP_SEEN_KEY]: String(id) }),
    failFirst: fixtureRepFailPoints(uiVerifyArgument('uiVerifyRepFail')),
    delayMs: Number(uiVerifyArgument('uiVerifyRepDelayMs') ?? 0) || 0,
    onCall: (name, args) => {
      calls.push({ name, args });
      Settings.set({ [CALLS_KEY]: JSON.stringify(calls) });
    },
  });
}

const service = uiVerify ? verifyService() : createSupabaseReputationService(getSupabase());

export const reviewDrafts = createReviewDrafts(Settings);

export const reviewStore = createReviewStore({ service, drafts: reviewDrafts });
export const profileStore = createProfileStore({
  service,
  drafts: reviewDrafts,
  onReplied: reviewStore.applyReply,
});
export const meStore = createMeStore({ service });

if (uiVerify) reviewDrafts.clear(FIXTURE_REP_USER_ID);

const stores = [reviewStore, profileStore, meStore];

function refreshAll() {
  for (const store of stores) store.refresh();
}

export function followReputation(userId: string | null, appState: AppStateSource) {
  if (!userId) {
    for (const store of stores) store.clear();
    return () => undefined;
  }
  for (const store of stores) store.start(userId);
  return onReturnToForeground(appState, refreshAll);
}

live.on(REVIEW_SIGNALS, (signal) => {
  reviewStore.onSignal(signal);
  profileStore.onSignal();
});
live.on(['payment.settled', 'ride.settled'], (signal) => {
  meStore.onStickers();
  reviewStore.onSettled(signal);
});
blockEvents.onBlocked((personId) => profileStore.markBlocked(personId, true));
blockEvents.onUnblocked((personId) => profileStore.markBlocked(personId, false));

userCleanups.register((userId) => reviewDrafts.clear(userId));

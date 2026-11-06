import { Settings } from 'react-native';

import { onReturnToForeground, type AppStateSource } from '@/lib/foreground';
import { live } from '@/lib/live';
import { getSupabase } from '@/lib/supabase';
import { uiVerify, uiVerifyArgument } from '@/lib/uiVerify';
import { userCleanups } from '@/lib/userCleanups';

import { createCodeDrafts } from './codeDrafts';
import { createSupabaseCoinsService } from './coinsService';
import { createCoinsStore } from './coinsStore';
import { coinsFailPoints, coinsVariant, createFixtureCoinsService } from './fixtureCoinsService';

const FIXTURE_USER_ID = '00000000-0000-4000-8000-000000000001';
const CALLS_KEY = 'uiVerifyCoinsCalls';

function verifyService() {
  Settings.set({ [CALLS_KEY]: '[]' });
  const calls: unknown[] = [];
  return createFixtureCoinsService({
    variant: coinsVariant(uiVerifyArgument('uiVerifyCoins')),
    failFirst: coinsFailPoints(uiVerifyArgument('uiVerifyCoinsFail')),
    delayMs: Number(uiVerifyArgument('uiVerifyCoinsDelayMs') ?? 0) || 0,
    onCall: (name, args) => {
      calls.push({ name, args });
      Settings.set({ [CALLS_KEY]: JSON.stringify(calls) });
    },
  });
}

const service = uiVerify ? verifyService() : createSupabaseCoinsService(getSupabase());

const codeDrafts = createCodeDrafts(Settings);

export const coinsStore = createCoinsStore({ service, drafts: codeDrafts });

if (uiVerify) codeDrafts.set(FIXTURE_USER_ID, uiVerifyArgument('uiVerifyInviteDraft') ?? '');

export function followCoins(userId: string | null, appState: AppStateSource) {
  if (!userId) {
    coinsStore.clear();
    return () => undefined;
  }
  coinsStore.start(userId);
  return onReturnToForeground(appState, coinsStore.refresh);
}

live.on(['payment.settled', 'ride.settled'], (signal) =>
  signal === null ? coinsStore.refresh() : coinsStore.onCoinsChanged(),
);

userCleanups.register((userId) => codeDrafts.set(userId, ''));

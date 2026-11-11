import * as Clipboard from 'expo-clipboard';
import { Settings, Share } from 'react-native';
import { Store } from 'tapiro-kit';

import { onReturnToForeground, type AppStateSource } from '@/lib/foreground';
import { live } from '@/lib/live';
import { getSupabase } from '@/lib/supabase';
import { uiVerify, uiVerifyArgument } from '@/lib/uiVerify';
import { uiVerifyPurchases } from '@/lib/uiVerifyPurchases';
import { userCleanups } from '@/lib/userCleanups';

import { createCodeDrafts } from './codeDrafts';
import { createSupabaseCoinsService } from './coinsService';
import { createCoinsStore } from './coinsStore';
import { coinsFailPoints, coinsVariant, createFixtureCoinsService } from './fixtureCoinsService';
import { createVerifyClient } from './purchase';
import {
  createFixtureStore,
  createFixtureVerify,
  FIXTURE_PACKS,
  storeMode,
} from './purchase/fixtureStore';
import { toServerPacks } from './purchase/packs';
import { createPurchaseStore } from './purchase/purchaseStore';
import type { PurchaseDeps } from './purchase/types';

const FIXTURE_USER_ID = '00000000-0000-4000-8000-000000000001';
const CALLS_KEY = 'uiVerifyCoinsCalls';

const calls: unknown[] = [];

function recordCall(name: string, args: unknown) {
  calls.push({ name, args });
  Settings.set({ [CALLS_KEY]: JSON.stringify(calls) });
}

function verifyService() {
  Settings.set({ [CALLS_KEY]: '[]' });
  return createFixtureCoinsService({
    variant: coinsVariant(uiVerifyArgument('uiVerifyCoins')),
    fedAtStart: uiVerifyArgument('uiVerifyCoins') === undefined ? true : undefined,
    failFirst: coinsFailPoints(uiVerifyArgument('uiVerifyCoinsFail')),
    delayMs: Number(uiVerifyArgument('uiVerifyCoinsDelayMs') ?? 0) || 0,
    onCall: recordCall,
  });
}

const fixture = uiVerify ? verifyService() : null;
const service = fixture ?? createSupabaseCoinsService(getSupabase());

const codeDrafts = createCodeDrafts(Settings);

export const inviteDevice = {
  async copy(text: string) {
    try {
      await Clipboard.setStringAsync(text);
      return true;
    } catch {
      return false;
    }
  },
  async share(message: string) {
    if (uiVerify) {
      recordCall('share', { message });
      return;
    }
    try {
      await Share.share({ message });
    } catch {
      return;
    }
  },
};

export const coinsStore = createCoinsStore({ service, drafts: codeDrafts });

function purchaseDeps(): Omit<PurchaseDeps, 'onCoinsChanged'> {
  if (fixture) {
    const mode = storeMode(uiVerifyArgument('uiVerifyStore'));
    const delayMs = Number(uiVerifyArgument('uiVerifyStoreDelayMs') ?? 0) || 0;
    return {
      store: createFixtureStore({
        mode,
        delayMs,
        userId: () => FIXTURE_USER_ID,
        onCall: recordCall,
      }),
      packs: async () => FIXTURE_PACKS,
      verify: createFixtureVerify({
        mode,
        delayMs,
        onCall: recordCall,
        credit: (_productId, coins) => {
          uiVerifyPurchases.add(coins);
          return fixture.creditPurchase(coins);
        },
      }),
    };
  }
  const client = getSupabase();
  return {
    store: Store,
    packs: async () => {
      if (!client) throw new Error('Supabase is not configured');
      const { data, error } = await client.rpc('iap_packs');
      if (error) throw error;
      return toServerPacks(data);
    },
    verify: client
      ? createVerifyClient(client)
      : async () => ({ ok: false, httpStatus: null, error: 'network' }),
  };
}

export const purchaseStore = createPurchaseStore({
  ...purchaseDeps(),
  onCoinsChanged: () => coinsStore.onCoinsChanged(),
});

if (uiVerify) codeDrafts.set(FIXTURE_USER_ID, uiVerifyArgument('uiVerifyInviteDraft') ?? '');

export function followCoins(userId: string | null, appState: AppStateSource) {
  if (!userId) {
    coinsStore.clear();
    purchaseStore.clear();
    return () => undefined;
  }
  coinsStore.start(userId);
  void purchaseStore.start(userId);
  return onReturnToForeground(appState, coinsStore.refresh);
}

live.on(
  [
    'payment.settled',
    'ride.settled',
    'bounty.cancelled',
    'bounty.expired',
    'ride.cancelled',
    'ride.expired',
  ],
  (signal) => (signal === null ? coinsStore.refresh() : coinsStore.onCoinsChanged()),
);

userCleanups.register((userId) => codeDrafts.set(userId, ''));

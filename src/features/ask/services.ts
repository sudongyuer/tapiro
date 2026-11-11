import { Settings } from 'react-native';

import { getSupabase } from '@/lib/supabase';
import { uiVerify, uiVerifyArgument } from '@/lib/uiVerify';
import { userCleanups } from '@/lib/userCleanups';

import { createCloudSender, createSupabaseAskService } from './askService';
import { createCloudGate } from './cloudGate';
import { createConsentStore } from './consentStore';
import { createFixtureAskService, fixtureConsent, fixtureFailPoints } from './fixtureAskService';

const CALLS_KEY = 'uiVerifyAiCalls';
const VERIFY_DELAY_MS = 1500;

const calls: unknown[] = [];

function recordCall(name: string, args: unknown) {
  calls.push({ name, args });
  Settings.set({ [CALLS_KEY]: JSON.stringify(calls) });
}

function verifyService() {
  Settings.set({ [CALLS_KEY]: '[]' });
  return createFixtureAskService({
    consent: fixtureConsent(uiVerifyArgument('uiVerifyAiConsent')),
    failFirst: fixtureFailPoints(uiVerifyArgument('uiVerifyAiFail')),
    delayMs: Number(uiVerifyArgument('uiVerifyAiDelayMs') ?? VERIFY_DELAY_MS) || 0,
    onCall: recordCall,
  });
}

const service = uiVerify ? verifyService() : createSupabaseAskService(getSupabase());

export const consentStore = createConsentStore(service);

export const cloudCall = createCloudGate({
  store: consentStore,
  send: uiVerify
    ? async () => ({ ok: false, error: 'provider_error', status: 502 })
    : createCloudSender(getSupabase()),
});

const composerDrafts = new Map<string, string>();

export const askDrafts = {
  get: (userId: string) => composerDrafts.get(userId) ?? '',
  set(userId: string, text: string) {
    if (text) composerDrafts.set(userId, text);
    else composerDrafts.delete(userId);
  },
};

userCleanups.register((userId) => {
  composerDrafts.delete(userId);
  consentStore.clear();
});

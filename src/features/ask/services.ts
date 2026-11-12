import { Settings } from 'react-native';

import { sessionEnds } from '@/lib/sessionEnds';
import { getSupabase } from '@/lib/supabase';
import { uiVerify, uiVerifyArgument } from '@/lib/uiVerify';
import { userCleanups } from '@/lib/userCleanups';

import { createCloudSender, createSupabaseAskService } from './askService';
import { createAskSession, type AskStorage } from './askSession';
import { createCloudGate } from './cloudGate';
import { createConsentStore } from './consentStore';
import { createFixtureSender, fixtureReplies } from './fixtureAskReplies';
import { createFixtureAskService, fixtureConsent, fixtureFailPoints } from './fixtureAskService';
import { createSettingsAskStorage } from './settingsAskStorage';

const CALLS_KEY = 'uiVerifyAiCalls';
const VERIFY_DELAY_MS = 1500;

const calls: unknown[] = [];

function recordCall(name: string, args: unknown) {
  calls.push({ name, args });
  Settings.set({ [CALLS_KEY]: JSON.stringify(calls) });
}

const verifyDelay = () => Number(uiVerifyArgument('uiVerifyAiDelayMs') ?? VERIFY_DELAY_MS) || 0;

function verifyServices() {
  Settings.set({ [CALLS_KEY]: '[]' });
  const service = createFixtureAskService({
    consent: fixtureConsent(uiVerifyArgument('uiVerifyAiConsent')),
    failFirst: fixtureFailPoints(uiVerifyArgument('uiVerifyAiFail')),
    delayMs: verifyDelay(),
    onCall: recordCall,
  });
  const send = createFixtureSender({
    replies: fixtureReplies(uiVerifyArgument('uiVerifyAiReplies')),
    delayMs: verifyDelay(),
    onCall: recordCall,
    onConsentRequired: () => service.withdrawElsewhere(),
  });
  return { service, send };
}

// Cases share one install, so a verify launch starts with no kept words or conversation unless it asks to keep them.
function freshEachLaunch(storage: AskStorage): AskStorage {
  const cleared = new Set<string>();
  const fresh = (userId: string) => {
    if (cleared.has(userId)) return;
    cleared.add(userId);
    storage.writeText(userId, '');
    storage.writeConversation(userId, null);
  };
  return {
    readText(userId) {
      fresh(userId);
      return storage.readText(userId);
    },
    writeText(userId, text) {
      fresh(userId);
      storage.writeText(userId, text);
    },
    readConversation(userId) {
      fresh(userId);
      return storage.readConversation(userId);
    },
    writeConversation(userId, value) {
      fresh(userId);
      storage.writeConversation(userId, value);
    },
  };
}

const verify = uiVerify ? verifyServices() : null;

const deviceStorage = createSettingsAskStorage(Settings);

export const consentStore = createConsentStore(
  verify?.service ?? createSupabaseAskService(getSupabase()),
);

export const cloudCall = createCloudGate({
  store: consentStore,
  send: verify?.send ?? createCloudSender(getSupabase()),
});

export const askSession = createAskSession({
  call: cloudCall,
  consent: consentStore,
  storage:
    verify && uiVerifyArgument('uiVerifyAskKeep') !== '1'
      ? freshEachLaunch(deviceStorage)
      : deviceStorage,
});

userCleanups.register((userId) => {
  askSession.forget(userId);
  consentStore.clear();
});

sessionEnds.register((userId) => askSession.forget(userId));

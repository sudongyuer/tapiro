import { Settings } from 'react-native';

import { sessionEnds } from '@/lib/sessionEnds';
import { STOREFRONT_HEADER, aiOfferedNow, currentStorefrontHeader } from '@/lib/storefront';
import { getSupabase } from '@/lib/supabase';
import { uiVerify, uiVerifyArgument } from '@/lib/uiVerify';
import { userCleanups } from '@/lib/userCleanups';

import { createCloudSender, createSupabaseAskService } from './askService';
import { createAskSession, type AskStorage } from './askSession';
import { createCloudGate } from './cloudGate';
import { createConsentStore } from './consentStore';
import { createFixtureSender, fixtureReplies } from './fixtureAskReplies';
import {
  FIXTURE_TRANSLATE_COST,
  createFixtureAskService,
  fixtureBelly,
  fixtureConsent,
  fixtureFailPoints,
} from './fixtureAskService';
import { createFixtureMemoryService, fixtureMemory, fixtureMemoryFails } from './fixtureMemory';
import { createFixtureSpeech, fixtureEngine, fixtureVoice } from './fixtureSpeech';
import { createSupabaseMemoryService } from './memory';
import { createMemoryStore } from './memoryStore';
import { metered } from './metered';
import { createPantryStore } from './pantryStore';
import { createSettingsAskStorage, createSettingsTranslationStorage } from './settingsAskStorage';
import { kitSpeech } from './speech';
import { createTranslations, type TranslationStorage } from './translations';
import { createVoice } from './voice';

const CALLS_KEY = 'uiVerifyAiCalls';
const VERIFY_DELAY_MS = 1500;

const calls: unknown[] = [];

function recordCall(name: string, args: unknown) {
  calls.push({ name, args });
  Settings.set({ [CALLS_KEY]: JSON.stringify(calls) });
}

const FIXTURE_OFFER = { kind: 'place', label: '图书馆', content: 'Sunway University 图书馆' };

const verifyDelay = () => Number(uiVerifyArgument('uiVerifyAiDelayMs') ?? VERIFY_DELAY_MS) || 0;

function verifyServices() {
  Settings.set({ [CALLS_KEY]: '[]' });
  const service = createFixtureAskService({
    consent: fixtureConsent(uiVerifyArgument('uiVerifyAiConsent')),
    belly: fixtureBelly(uiVerifyArgument('uiVerifyAiBelly')),
    failFirst: fixtureFailPoints(uiVerifyArgument('uiVerifyAiFail')),
    delayMs: verifyDelay(),
    onCall: recordCall,
  });
  const memory = createFixtureMemoryService({
    memory: fixtureMemory(uiVerifyArgument('uiVerifyAiMemory')),
    failFirst: fixtureMemoryFails(uiVerifyArgument('uiVerifyAiMemoryFail')),
    delayMs: verifyDelay(),
    onCall: recordCall,
  });
  const send = createFixtureSender({
    replies: fixtureReplies(uiVerifyArgument('uiVerifyAiReplies')),
    delayMs: verifyDelay(),
    onCall: recordCall,
    onConsentRequired: () => service.withdrawElsewhere(),
    meter: (task) => service.spend(task === 'translate' ? FIXTURE_TRANSLATE_COST : undefined),
    onHungry: () => service.starve(),
    memory: (text, reply) => ({
      used: memory
        .usedFor(reply === 'draftMemory' ? null : text)
        .map(({ id, kind, label, content }) => ({ id, kind, label, content })),
      offer:
        reply === 'answerOffer' && memory.remembering()
          ? { ...FIXTURE_OFFER, replaces: null }
          : null,
    }),
  });
  const speech = createFixtureSpeech({
    voice: fixtureVoice(uiVerifyArgument('uiVerifyVoice')),
    engine: fixtureEngine(uiVerifyArgument('uiVerifyVoiceEngine')),
    onCall: recordCall,
  });
  return { service, send, speech, memory };
}

// Cases share one install, so a verify launch starts with no kept words, conversation or translations unless it asks to
// keep them.
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

function freshTranslations(storage: TranslationStorage): TranslationStorage {
  const cleared = new Set<string>();
  const fresh = (userId: string) => {
    if (cleared.has(userId)) return;
    cleared.add(userId);
    storage.write(userId, null);
  };
  return {
    read(userId) {
      fresh(userId);
      return storage.read(userId);
    },
    write(userId, kept) {
      fresh(userId);
      storage.write(userId, kept);
    },
  };
}

const verify = uiVerify ? verifyServices() : null;

const keepAsk = uiVerifyArgument('uiVerifyAskKeep') === '1';

const deviceStorage = createSettingsAskStorage(Settings);

const service = verify?.service ?? createSupabaseAskService(getSupabase());

export const consentStore = createConsentStore(service);

export const memoryStore = createMemoryStore(
  verify?.memory ?? createSupabaseMemoryService(getSupabase()),
  (userId, ids) => askSession.dropMemoryUse(userId, ids),
);

export const pantryStore = createPantryStore({
  service,
  status: consentStore,
});

export const cloudCall = createCloudGate({
  store: consentStore,
  send: metered(
    consentStore,
    verify?.send ??
      createCloudSender(getSupabase(), () => ({ [STOREFRONT_HEADER]: currentStorefrontHeader() })),
  ),
  offered: aiOfferedNow,
});

export const askSession = createAskSession({
  call: cloudCall,
  consent: consentStore,
  storage: verify && !keepAsk ? freshEachLaunch(deviceStorage) : deviceStorage,
});

const translationStorage = createSettingsTranslationStorage(Settings);

export const translations = createTranslations({
  call: cloudCall,
  consent: consentStore,
  storage: verify && !keepAsk ? freshTranslations(translationStorage) : translationStorage,
});

export const voice = createVoice({
  speech: verify?.speech ?? kitSpeech,
  text: askSession,
  call: cloudCall,
  consent: consentStore,
});

function forgetAsk(userId: string) {
  voice.forget();
  askSession.forget(userId);
  translations.forget(userId);
  pantryStore.clear();
  consentStore.clear();
  memoryStore.forget();
}

userCleanups.register(forgetAsk);
sessionEnds.register(forgetAsk);

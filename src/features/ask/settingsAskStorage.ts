import type { AskStorage } from './askSession';
import type { TranslationStorage } from './translations';

export type SettingsLike = {
  get(key: string): unknown;
  set(values: Record<string, unknown>): void;
};

const textKey = (userId: string) => `tapiro.askText.${userId}`;
const conversationKey = (userId: string) => `tapiro.askConversation.${userId}`;
const translationsKey = (userId: string) => `tapiro.askTranslations.${userId}`;

function readJson(settings: SettingsLike, key: string): unknown {
  const value = settings.get(key);
  if (typeof value !== 'string' || value === '') return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

// Cleared by writing '': Settings.set drops null-valued keys when it builds the property list.
export function createSettingsAskStorage(settings: SettingsLike): AskStorage {
  return {
    readText(userId) {
      const value = settings.get(textKey(userId));
      return typeof value === 'string' ? value : '';
    },
    writeText(userId, text) {
      settings.set({ [textKey(userId)]: text });
    },
    readConversation: (userId) => readJson(settings, conversationKey(userId)),
    writeConversation(userId, conversation) {
      settings.set({
        [conversationKey(userId)]: conversation === null ? '' : JSON.stringify(conversation),
      });
    },
  };
}

export function createSettingsTranslationStorage(settings: SettingsLike): TranslationStorage {
  return {
    read: (userId) => readJson(settings, translationsKey(userId)),
    write(userId, kept) {
      settings.set({
        [translationsKey(userId)]: kept === null || kept.length === 0 ? '' : JSON.stringify(kept),
      });
    },
  };
}

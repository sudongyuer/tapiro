import type { AskStorage } from './askSession';

type SettingsLike = { get(key: string): unknown; set(values: Record<string, unknown>): void };

const textKey = (userId: string) => `tapiro.askText.${userId}`;
const conversationKey = (userId: string) => `tapiro.askConversation.${userId}`;

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
    readConversation(userId) {
      const value = settings.get(conversationKey(userId));
      if (typeof value !== 'string' || value === '') return null;
      try {
        return JSON.parse(value) as unknown;
      } catch {
        return null;
      }
    },
    writeConversation(userId, conversation) {
      settings.set({
        [conversationKey(userId)]: conversation === null ? '' : JSON.stringify(conversation),
      });
    },
  };
}

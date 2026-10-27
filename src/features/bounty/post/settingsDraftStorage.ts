import type { DraftStorage } from './draftStore';

export type SettingsLike = {
  get(key: string): unknown;
  set(values: Record<string, unknown>): void;
};

const key = (userId: string) => `tapiro.bountyDraft.${userId}`;

// Stored as a JSON string, and cleared by writing '': Settings.set drops null-valued keys when converting to a
// property list, so a null would leave the old draft in place and a draft object would lose its null fields.
export function createSettingsDraftStorage(settings: SettingsLike): DraftStorage {
  return {
    read(userId) {
      const value = settings.get(key(userId));
      if (typeof value !== 'string' || value === '') return null;
      try {
        return JSON.parse(value) as unknown;
      } catch {
        return null;
      }
    },
    write(userId, draft) {
      settings.set({ [key(userId)]: draft === null ? '' : JSON.stringify(draft) });
    },
  };
}

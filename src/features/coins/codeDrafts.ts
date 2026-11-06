export type SettingsLike = {
  get(key: string): unknown;
  set(values: Record<string, unknown>): void;
};

const key = (userId: string) => `tapiro.inviteCodeDraft.${userId}`;

export function createCodeDrafts(settings: SettingsLike) {
  return {
    get(userId: string) {
      const raw = settings.get(key(userId));
      return typeof raw === 'string' ? raw : '';
    },
    set(userId: string, typed: string) {
      settings.set({ [key(userId)]: typed });
    },
  };
}

export type CodeDrafts = ReturnType<typeof createCodeDrafts>;

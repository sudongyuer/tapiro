import type { SettingsLike } from '../drafts';

export function createGrowMarks(settings: SettingsLike, keyOf: (userId: string) => string) {
  return {
    played(userId: string) {
      const stored = Number(settings.get(keyOf(userId)));
      return Number.isFinite(stored) ? stored : 0;
    },
    mark(userId: string, level: number) {
      settings.set({ [keyOf(userId)]: String(level) });
    },
    clear(userId: string) {
      settings.set({ [keyOf(userId)]: null });
    },
  };
}

export type GrowMarks = ReturnType<typeof createGrowMarks>;

import type { UserCleanups } from '@/lib/userCleanups';

export const BOOK_VIEWS = ['stack', 'calendar'] as const;
export type BookView = (typeof BOOK_VIEWS)[number];

type SettingsLike = { get(key: string): unknown; set(values: Record<string, unknown>): void };

const key = (userId: string) => `tapiro.bookView.${userId}`;

export function createBookViewStore(settings: SettingsLike, cleanups?: UserCleanups) {
  const store = {
    view(userId: string): BookView {
      return settings.get(key(userId)) === 'calendar' ? 'calendar' : 'stack';
    },
    setView(userId: string, view: BookView) {
      settings.set({ [key(userId)]: view });
    },
    clear(userId: string) {
      settings.set({ [key(userId)]: '' });
    },
  };
  cleanups?.register((userId) => store.clear(userId));
  return store;
}

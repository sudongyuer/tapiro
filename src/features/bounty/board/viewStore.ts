import type { UserCleanups } from '@/lib/userCleanups';

import type { SettingsLike } from './originStore';

export const BOARD_VIEWS = ['list', 'map'] as const;
export type BoardView = (typeof BOARD_VIEWS)[number];

const viewKey = (userId: string) => `tapiro.boardView.${userId}`;
const hintKey = (userId: string) => `tapiro.boardViewHint.${userId}`;

export function createViewStore(settings: SettingsLike, cleanups?: UserCleanups) {
  const store = {
    boardView(userId: string): BoardView {
      return settings.get(viewKey(userId)) === 'map' ? 'map' : 'list';
    },
    setBoardView(userId: string, view: BoardView) {
      settings.set({ [viewKey(userId)]: view });
    },
    hintShown(userId: string): boolean {
      return settings.get(hintKey(userId)) === '1';
    },
    markHintShown(userId: string) {
      settings.set({ [hintKey(userId)]: '1' });
    },
    clear(userId: string) {
      settings.set({ [viewKey(userId)]: '', [hintKey(userId)]: '' });
    },
  };
  cleanups?.register((userId) => store.clear(userId));
  return store;
}

export type ViewStore = ReturnType<typeof createViewStore>;

export function seedBoardView(store: ViewStore, userId: string, seeded: string | undefined) {
  if (seeded === 'keep') return;
  store.clear(userId);
  store.setBoardView(userId, BOARD_VIEWS.find((candidate) => candidate === seeded) ?? 'list');
}

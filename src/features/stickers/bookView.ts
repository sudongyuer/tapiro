import { Settings } from 'react-native';

import { uiVerify, uiVerifyArgument } from '@/lib/uiVerify';
import { userCleanups } from '@/lib/userCleanups';

import { BOOK_VIEWS, createBookViewStore, type BookView } from './bookViewStore';

export const bookViewStore = createBookViewStore(Settings, userCleanups);

const seeded = uiVerify ? uiVerifyArgument('uiVerifyBookView') : undefined;
let seed: BookView | null = BOOK_VIEWS.find((view) => view === seeded) ?? null;

export function initialBookView(userId: string): BookView {
  if (seed) bookViewStore.setView(userId, seed);
  seed = null;
  return bookViewStore.view(userId);
}

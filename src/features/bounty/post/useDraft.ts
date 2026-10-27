import { useSyncExternalStore } from 'react';

import { draftStore } from './services';

export function useDraft(userId: string) {
  return useSyncExternalStore(draftStore.subscribe, () => draftStore.load(userId));
}

export function resetDraft(userId: string) {
  draftStore.clear(userId);
  return draftStore.load(userId);
}

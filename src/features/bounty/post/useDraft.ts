import { useSyncExternalStore } from 'react';

import { createStore } from '@/lib/store';

import { draftStore } from './services';
import type { DraftError } from './types';

export const formError = createStore<DraftError | null>(null);

export function useFormError() {
  return useSyncExternalStore(formError.subscribe, formError.get);
}

export function useDraft(userId: string) {
  return useSyncExternalStore(draftStore.subscribe, () => draftStore.load(userId));
}

export function resetDraft(userId: string) {
  draftStore.clear(userId);
  formError.set(null);
  return draftStore.load(userId);
}

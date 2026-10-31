import { draftStore } from './services';

export function hasPostDraft(userId: string) {
  return !draftStore.isEmpty(draftStore.load(userId));
}

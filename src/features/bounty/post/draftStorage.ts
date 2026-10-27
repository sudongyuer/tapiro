import { Settings } from 'react-native';

import { uiVerify, uiVerifyArgument } from '@/lib/uiVerify';

import { newDraftId } from './draftId';
import type { DraftStorage } from './draftStore';
import { FIXTURE_USER_ID, fixtureDraft } from './fixtureDrafts';

const key = (userId: string) => `tapiro.bountyDraft.${userId}`;

// Stored as a JSON string: Settings.set drops null-valued keys when converting to a property list, so a
// draft object would come back after a relaunch without `description`/`place` and fail to parse.
export const settingsDraftStorage: DraftStorage = {
  read(userId) {
    const value: unknown = Settings.get(key(userId));
    if (typeof value !== 'string') return null;
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  },
  write(userId, draft) {
    Settings.set({ [key(userId)]: draft === null ? null : JSON.stringify(draft) });
  },
};

if (uiVerify) {
  const seed = fixtureDraft(uiVerifyArgument('uiVerifyBountyDraft'), newDraftId(), new Date());
  if (seed) settingsDraftStorage.write(FIXTURE_USER_ID, seed);
}

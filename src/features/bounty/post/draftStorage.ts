import { Settings } from 'react-native';

import { uiVerify, uiVerifyArgument } from '@/lib/uiVerify';

import { newDraftId } from './draftId';
import type { DraftStorage } from './draftStore';
import { FIXTURE_USER_ID, fixtureDraft } from './fixtureDrafts';

const key = (userId: string) => `tapiro.bountyDraft.${userId}`;

// Stored as a JSON string, and cleared by writing '': Settings.set drops null-valued keys when converting to a
// property list, so a null would leave the old draft in place and a draft object would lose its null fields.
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
    Settings.set({ [key(userId)]: draft === null ? '' : JSON.stringify(draft) });
  },
};

const seedName = uiVerifyArgument('uiVerifyBountyDraft');
if (uiVerify && seedName !== undefined) {
  settingsDraftStorage.write(FIXTURE_USER_ID, fixtureDraft(seedName, newDraftId(), new Date()));
}

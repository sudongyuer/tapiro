import { Settings } from 'react-native';

import { uiVerify, uiVerifyArgument } from '@/lib/uiVerify';

import { newDraftId } from './draftId';
import { FIXTURE_USER_ID, fixtureDraft } from './fixtureDrafts';
import { createSettingsDraftStorage } from './settingsDraftStorage';

export const settingsDraftStorage = createSettingsDraftStorage(Settings);

const seedName = uiVerifyArgument('uiVerifyBountyDraft');
if (uiVerify && seedName !== undefined) {
  settingsDraftStorage.write(FIXTURE_USER_ID, fixtureDraft(seedName, newDraftId(), new Date()));
}

import { uiVerify, uiVerifyArgument } from '@/lib/uiVerify';
import { userCleanups } from '@/lib/userCleanups';

import { seededNote } from './fixtureNotes';
import { createNoteDrafts } from './noteDrafts';

export const noteDrafts = createNoteDrafts(
  uiVerify ? seededNote(uiVerifyArgument('uiVerifyApplyNote')) : '',
);

userCleanups.register(() => noteDrafts.clear());

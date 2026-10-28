import { uiVerify, uiVerifyArgument } from '@/lib/uiVerify';
import { userCleanups } from '@/lib/userCleanups';

import { createNoteDrafts } from './noteDrafts';

export const noteDrafts = createNoteDrafts(
  uiVerify ? (uiVerifyArgument('uiVerifyApplyNote') ?? '') : '',
);

userCleanups.register(() => noteDrafts.clear());

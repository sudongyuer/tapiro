import { Settings } from 'react-native';

import { uiVerify, uiVerifyArgument } from '@/lib/uiVerify';

import { createFixtureNotices } from './fixtureNotices';
import { nativeNotices } from './native';
import type { Notices } from './types';

const SCHEDULED_KEY = 'uiVerifyScheduledNotices';
const ASKS_KEY = 'uiVerifyNoticeAsks';

function verifyNotices() {
  Settings.set({ [SCHEDULED_KEY]: '[]', [ASKS_KEY]: '0' });
  return createFixtureNotices(uiVerifyArgument('uiVerifyNotifications'), (scheduled, asks) =>
    Settings.set({ [SCHEDULED_KEY]: JSON.stringify(scheduled), [ASKS_KEY]: String(asks) }),
  );
}

export const notices: Notices = uiVerify ? verifyNotices() : nativeNotices;

export { canSchedule } from './permission';
export { outsideQuietHours } from './quietHours';
export { applyNoticeDiff, noticeDiff } from './reconcile';
export { useNoticeRouting } from './useNoticeRouting';
export type { LocalNotice, NoticeData, NoticePermission, ScheduledNotice } from './types';

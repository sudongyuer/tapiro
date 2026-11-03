import { Settings } from 'react-native';

import { createStore } from '@/lib/store';
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

const source: Notices = uiVerify ? verifyNotices() : nativeNotices;

export const permissionAnswers = createStore(0);

const answered = () => permissionAnswers.set(permissionAnswers.get() + 1);

export const notices: Notices = {
  ...source,
  async askProvisional() {
    await source.askProvisional();
    answered();
  },
  async askInContext() {
    const permission = await source.askInContext();
    answered();
    return permission;
  },
};

export { canSchedule } from './permission';
export { outsideQuietHours } from './quietHours';
export { applyNoticeDiff, noticeDiff } from './reconcile';
export { noticeRoute, type NoticeRoute } from './routes';
export { useDiscardNoticeTaps, useNoticeRouting } from './useNoticeRouting';
export type { LocalNotice, NoticeData, NoticePermission, ScheduledNotice } from './types';

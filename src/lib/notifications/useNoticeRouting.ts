import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';

import { uiVerify, uiVerifyArgument } from '@/lib/uiVerify';

import { followNoticeTaps, verifyNoticeTaps, type NoticeTap, type NoticeTaps } from './noticeTaps';
import type { NoticeRoute } from './routes';

const toTap = (response: Notifications.NotificationResponse | null): NoticeTap | null =>
  response
    ? {
        key: `${response.notification.request.identifier}:${response.notification.date}`,
        data: response.notification.request.content.data,
      }
    : null;

const nativeTaps: NoticeTaps = {
  last: async () => toTap(Notifications.getLastNotificationResponse()),
  listen(on) {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const tap = toTap(response);
      if (tap) on(tap);
    });
    return () => subscription.remove();
  },
  clear: () => Notifications.clearLastNotificationResponse(),
};

const taps = uiVerify ? verifyNoticeTaps(uiVerifyArgument('uiVerifyNoticeTap')) : nativeTaps;
const handled = new Set<string>();

export function useNoticeRouting(open: (route: NoticeRoute) => void, ready: boolean) {
  const latest = useRef(open);
  useEffect(() => {
    latest.current = open;
  });

  useEffect(() => {
    if (!ready) return;
    return followNoticeTaps(taps, handled, (route) => latest.current(route));
  }, [ready]);
}

export function useDiscardNoticeTaps(signedOut: boolean) {
  useEffect(() => {
    if (!signedOut) return;
    return followNoticeTaps(taps, handled, null);
  }, [signedOut]);
}

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
  last: async () => toTap(await Notifications.getLastNotificationResponseAsync()),
  listen(on) {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const tap = toTap(response);
      if (tap) on(tap);
    });
    return () => subscription.remove();
  },
  clear: () => void Notifications.clearLastNotificationResponseAsync().catch(() => undefined),
};

const taps = uiVerify ? verifyNoticeTaps(uiVerifyArgument('uiVerifyNoticeTap')) : nativeTaps;

export function useNoticeRouting(open: (route: NoticeRoute) => void, ready: boolean) {
  const latest = useRef(open);
  useEffect(() => {
    latest.current = open;
  });
  const handled = useRef(new Set<string>());

  useEffect(() => {
    if (!ready) return;
    return followNoticeTaps(taps, handled.current, (route) => latest.current(route));
  }, [ready]);
}

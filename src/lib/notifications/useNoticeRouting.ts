import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';

import { uiVerify } from '@/lib/uiVerify';

import type { NoticeData } from './types';

const toData = (value: unknown): NoticeData | null => {
  const body = value as Partial<NoticeData> | null | undefined;
  return typeof body?.kind === 'string' && typeof body.id === 'string'
    ? { kind: body.kind, id: body.id }
    : null;
};

export function useNoticeRouting(open: (data: NoticeData) => void, ready: boolean) {
  const latest = useRef(open);
  useEffect(() => {
    latest.current = open;
  });
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (uiVerify || !ready) return;
    const route = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const key = `${response.notification.request.identifier}:${response.notification.date}`;
      if (handled.current === key) return;
      handled.current = key;
      Notifications.clearLastNotificationResponse();
      const data = toData(response.notification.request.content.data);
      if (data) latest.current(data);
    };
    route(Notifications.getLastNotificationResponse());
    const subscription = Notifications.addNotificationResponseReceivedListener(route);
    return () => subscription.remove();
  }, [ready]);
}

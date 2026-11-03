import * as Notifications from 'expo-notifications';
import { Settings } from 'react-native';

import { shouldAskInContext, toPermission } from './permission';
import type { Notices } from './types';

const ASKED_KEY = 'tapiro.notificationsAsked';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const reading = async () => toPermission(await Notifications.getPermissionsAsync());

export const nativeNotices: Notices = {
  permission: reading,
  async askProvisional() {
    if ((await reading()) !== 'undetermined') return;
    await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true, allowProvisional: true },
    });
  },
  async askInContext() {
    const current = await reading();
    if (!shouldAskInContext(current, Settings.get(ASKED_KEY) === '1')) return current;
    Settings.set({ [ASKED_KEY]: '1' });
    return toPermission(
      await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      }),
    );
  },
  scheduler: {
    async scheduled() {
      const requests = await Notifications.getAllScheduledNotificationsAsync();
      return requests.map((request) => {
        const at = request.content.data?.at;
        return {
          id: request.identifier,
          at: typeof at === 'number' ? at : null,
          title: request.content.title ?? '',
          body: request.content.body ?? '',
        };
      });
    },
    async schedule(notice) {
      await Notifications.scheduleNotificationAsync({
        identifier: notice.id,
        content: {
          title: notice.title,
          body: notice.body,
          data: { ...notice.data, at: notice.at },
          sound: 'default',
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: notice.at },
      });
    },
    cancel: (id) => Notifications.cancelScheduledNotificationAsync(id),
  },
};

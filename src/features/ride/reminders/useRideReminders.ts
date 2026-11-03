import type { TFunction } from 'i18next';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { notices, permissionAnswers } from '@/lib/notifications';

import { rideReminders, rideService } from '../services';
import { reminderNotice } from './copy';
import { reminderTimes } from './ledger';
import { fromMyRide } from './inputs';
import { followReminderSync } from './reminderSync';
import { reminderId, type ReminderRide } from './plan';
import type { NoticeCopy } from './rideReminders';

export const noticeCopy =
  (t: TFunction, language: string): NoticeCopy =>
  (reminder, ride) =>
    reminderNotice(reminder, ride, t, language);

export function syncRideReminders(t: TFunction, language: string) {
  const readAt = Date.now();
  return rideService
    .mine()
    .then((mine) =>
      rideReminders.syncAll(mine.items.map(fromMyRide), noticeCopy(t, language), readAt),
    )
    .catch(() => {});
}

export async function askThenSync(t: TFunction, language: string) {
  await notices.askInContext().catch(() => null);
  await syncRideReminders(t, language);
}

export function syncOneRide(
  rideId: string,
  ride: ReminderRide | null,
  readAt: number,
  t: TFunction,
  language: string,
) {
  return rideReminders.syncRide(rideId, ride, noticeCopy(t, language), readAt);
}

export function useRideReminders(stage: 'loading' | 'signedOut' | 'onboarding' | 'ready') {
  const { t, language } = useI18n();
  useEffect(() => {
    if (stage === 'signedOut') void rideReminders.clear();
  }, [stage]);
  useEffect(() => {
    if (stage !== 'ready') return;
    return followReminderSync(
      AppState,
      permissionAnswers,
      () => void syncRideReminders(t, language),
    );
  }, [stage, t, language]);
}

export function usePayReminderTimes(rideId: string, now: number) {
  const ledger = useSyncExternalStore(rideReminders.ledger.subscribe, rideReminders.ledger.get);
  const ids = new Set([reminderId(rideId, 'pay24'), reminderId(rideId, 'pay72')]);
  return reminderTimes(ledger, (id) => ids.has(id), now);
}

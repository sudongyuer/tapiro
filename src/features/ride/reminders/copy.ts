import type { TFunction } from 'i18next';

import { formatMoney } from '@/lib/money';
import type { LocalNotice } from '@/lib/notifications';
import { localDayKey } from '@/lib/deviceClock';

import { dayRelation } from '../rideClock';
import { whenText } from '../ticketView';
import type { PlannedReminder, ReminderRide } from './plan';

export function reminderWhen(time: number, now: number, t: TFunction, language: string) {
  const text = whenText(time, now, t, language);
  if (dayRelation(localDayKey(time), now) === 'other') return text;
  return text.charAt(0).toLocaleLowerCase(language) + text.slice(1);
}

export function reminderNotice(
  reminder: PlannedReminder,
  ride: ReminderRide,
  t: TFunction,
  language: string,
): LocalNotice {
  const route = ride.route;
  const name = ride.organiserName ?? t('bounty.post.unknownName');
  const text = (): { title: string; body: string } => {
    switch (reminder.kind) {
      case 'meetup':
        return {
          title: t('rideReminders.meetup.title', { route }),
          body: t('rideReminders.meetup.body'),
        };
      case 'goOrCancel': {
        const count = Math.max(1, ride.seats - ride.taken);
        return {
          title: t('rideReminders.goOrCancel.title', { route, count }),
          body: t('rideReminders.goOrCancel.body'),
        };
      }
      case 'arrive':
        return {
          title: t('rideReminders.arrive.title', { route }),
          body: t(
            ride.splitMode === 'grab'
              ? 'rideReminders.arrive.bodyGrab'
              : 'rideReminders.arrive.body',
          ),
        };
      case 'pay24':
      case 'pay72':
        return {
          title: t('rideReminders.pay.title', {
            name,
            amount: ride.share ? formatMoney(ride.share, language) : '',
          }),
          body: t('rideReminders.pay.body', { route, name }),
        };
    }
  };
  return {
    id: reminder.id,
    at: reminder.at,
    ...text(),
    data: { kind: `ride.${reminder.kind}`, id: ride.id },
  };
}

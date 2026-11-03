import type { Translation } from '../../resources';

const reminders: Translation['rideReminders'] = {
  meetup: {
    title: 'Meet-up has started · {{route}}',
    body: 'Leaving in 30 minutes. At the meeting point, tap I’m Here in Tapiro.',
  },
  goOrCancel: {
    title_one: '{{count}} seat still empty · {{route}}',
    title_other: '{{count}} seats still empty · {{route}}',
    body: 'Leaving in 15 minutes and the ride isn’t full. Go anyway or cancel?',
  },
  arrive: {
    title: 'Arrived? · {{route}}',
    body: 'Once you’re there, tap Arrived · split the fare and enter the Grab total.',
    bodyGrab: 'Once you’re there, tap Arrived and the ride is settled.',
  },
  pay: {
    title: '{{amount}} still owed to {{name}}',
    body: 'Your fare for {{route}}. After 7 days unpaid, posting bounties and rides is paused.',
  },
};

export default reminders;

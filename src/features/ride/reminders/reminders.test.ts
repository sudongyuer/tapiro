import { describe, expect, test } from 'bun:test';

import type { NoticePermission } from '@/lib/notifications';
import { createFixtureNotices } from '@/lib/notifications/fixtureNotices';

import { nextLedger, readLedger, reminderTimes } from './ledger';
import { planReminders, reminderId, type ReminderRide } from './plan';
import { createRideReminders, type NoticeCopy } from './rideReminders';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const my = (iso: string) => Date.parse(`${iso}+08:00`);
const DEPART = '2026-11-04T09:00:00';

const ride = (patch: Partial<ReminderRide> = {}): ReminderRide => ({
  id: 'r1',
  route: '双威 → KLIA2',
  status: 'open',
  organiser: false,
  myStatus: 'accepted',
  departAt: new Date(my(DEPART)).toISOString(),
  revisedAt: null,
  seats: 4,
  taken: 4,
  splitMode: 'tapiro',
  eta: null,
  dueSince: null,
  share: null,
  organiserName: '小林',
  ...patch,
});

const kinds = (value: ReminderRide) =>
  planReminders(value).map((reminder) => [reminder.kind, reminder.at]);

describe('planReminders', () => {
  test('an accepted rider is reminded when 集合 starts, 30 minutes before departure', () => {
    expect(kinds(ride())).toEqual([['meetup', my(DEPART) - 30 * MINUTE]]);
  });

  test('a revised time moves 集合', () => {
    const revised = new Date(my(DEPART) + 20 * MINUTE).toISOString();
    expect(kinds(ride({ revisedAt: revised }))).toEqual([['meetup', my(DEPART) - 10 * MINUTE]]);
  });

  test('the organiser of a ride not full is also asked at T-15 to go or cancel', () => {
    expect(kinds(ride({ organiser: true, taken: 2 }))).toEqual([
      ['meetup', my(DEPART) - 30 * MINUTE],
      ['goOrCancel', my(DEPART) - 15 * MINUTE],
    ]);
    expect(kinds(ride({ organiser: true, taken: 4 }))).toEqual([
      ['meetup', my(DEPART) - 30 * MINUTE],
    ]);
  });

  test('applicants, people who left and no-shows get nothing', () => {
    for (const myStatus of [null, 'requested', 'left', 'no_show', 'appealed']) {
      expect(kinds(ride({ myStatus }))).toEqual([]);
    }
  });

  test('cancelled and expired rides get nothing', () => {
    expect(kinds(ride({ status: 'cancelled', organiser: true, taken: 1 }))).toEqual([]);
    expect(kinds(ride({ status: 'expired' }))).toEqual([]);
  });

  test('after 出发 the organiser is asked at the typed 预计到 to press 到了', () => {
    const eta = new Date(my('2026-11-04T09:50:00')).toISOString();
    expect(kinds(ride({ status: 'departed', organiser: true, eta }))).toEqual([
      ['arrive', my('2026-11-04T09:50:00')],
    ]);
    expect(kinds(ride({ status: 'departed', organiser: true, eta: null }))).toEqual([]);
    expect(kinds(ride({ status: 'departed', myStatus: 'boarded', eta }))).toEqual([]);
  });

  test('a rider who owes is reminded 24 h and 72 h after the split, outside quiet hours', () => {
    const owing = {
      status: 'settling' as const,
      myStatus: 'boarded',
      share: { minor: 2470, currency: 'MYR' as const },
    };
    expect(
      kinds(ride({ ...owing, dueSince: new Date(my('2026-11-04T10:30:00')).toISOString() })),
    ).toEqual([
      ['pay24', my('2026-11-05T10:30:00')],
      ['pay72', my('2026-11-07T10:30:00')],
    ]);
    expect(
      kinds(ride({ ...owing, dueSince: new Date(my('2026-11-04T23:40:00')).toISOString() })),
    ).toEqual([
      ['pay24', my('2026-11-06T08:00:00')],
      ['pay72', my('2026-11-08T08:00:00')],
    ]);
  });

  test('nothing is owed without a due time, or by the organiser', () => {
    const share = { minor: 2470, currency: 'MYR' as const };
    expect(kinds(ride({ status: 'settling', myStatus: 'boarded', share }))).toEqual([]);
    expect(
      kinds(
        ride({
          status: 'settling',
          organiser: true,
          myStatus: 'boarded',
          share,
          dueSince: new Date(my('2026-11-04T10:30:00')).toISOString(),
        }),
      ),
    ).toEqual([]);
  });
});

const copy: NoticeCopy = (reminder, value) => ({
  id: reminder.id,
  at: reminder.at,
  title: `${reminder.kind} ${value.route}`,
  body: 'body',
  data: { kind: `ride.${reminder.kind}`, id: value.id },
});

function setup(permission: NoticePermission = 'allowed', start = my('2026-11-04T07:00:00')) {
  const values = new Map<string, unknown>();
  const settings = {
    get: (key: string) => values.get(key),
    set: (patch: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(patch)) values.set(key, value);
    },
  };
  let now = start;
  const fake = createFixtureNotices(permission, () => {});
  const reminders = createRideReminders({
    permission: fake.permission,
    scheduler: fake.scheduler,
    settings,
    now: () => now,
  });
  const pending = async () =>
    (await fake.scheduler.scheduled()).map((item) => [item.id, item.at]).sort();
  return { reminders, pending, settings, advance: (ms: number) => (now += ms) };
}

describe('reconciling rides with the device', () => {
  test('scheduling twice from the same data changes nothing', async () => {
    const { reminders, pending } = setup();
    await reminders.syncAll([ride({ organiser: true, taken: 2 })], copy, 0);
    const first = await pending();
    await reminders.syncAll([ride({ organiser: true, taken: 2 })], copy, 0);
    expect(await pending()).toEqual(first);
    expect(first).toEqual([
      [reminderId('r1', 'goOrCancel'), my(DEPART) - 15 * MINUTE],
      [reminderId('r1', 'meetup'), my(DEPART) - 30 * MINUTE],
    ]);
  });

  test('a later departure reschedules under the same identifiers', async () => {
    const { reminders, pending } = setup();
    await reminders.syncAll([ride()], copy, 0);
    const later = new Date(my(DEPART) + HOUR).toISOString();
    await reminders.syncRide('r1', ride({ revisedAt: later }), copy, 0);
    expect(await pending()).toEqual([[reminderId('r1', 'meetup'), my(DEPART) + 30 * MINUTE]]);
  });

  test('leaving, a cancel, a block or a settle cancels the ride’s reminders', async () => {
    for (const after of [
      ride({ myStatus: 'left' }),
      ride({ status: 'cancelled' }),
      null,
      ride({ status: 'closed', myStatus: 'boarded' }),
    ]) {
      const { reminders, pending } = setup();
      await reminders.syncAll([ride(), ride({ id: 'r2' })], copy, 0);
      await reminders.syncRide('r1', after, copy, 0);
      expect(await pending()).toEqual([[reminderId('r2', 'meetup'), my(DEPART) - 30 * MINUTE]]);
    }
  });

  test('a ride missing from my rides is cancelled, other rides stay', async () => {
    const { reminders, pending } = setup();
    await reminders.syncAll([ride(), ride({ id: 'r2' })], copy, 0);
    await reminders.syncAll([ride({ id: 'r2' })], copy, 0);
    expect(await pending()).toEqual([[reminderId('r2', 'meetup'), my(DEPART) - 30 * MINUTE]]);
  });

  test('my rides read before a ride’s own detail do not overrule it', async () => {
    const { reminders, pending } = setup();
    await reminders.syncRide('r1', ride(), copy, 200);
    await reminders.syncAll([], copy, 100);
    expect(await pending()).toEqual([[reminderId('r1', 'meetup'), my(DEPART) - 30 * MINUTE]]);
    await reminders.syncAll([], copy, 300);
    expect(await pending()).toEqual([]);
  });

  test('signing out cancels every ride reminder and forgets what was sent', async () => {
    const { reminders, pending, settings } = setup();
    await reminders.syncAll([ride(), ride({ id: 'r2' })], copy, 0);
    await reminders.clear();
    expect(await pending()).toEqual([]);
    expect(readLedger(settings)).toEqual([]);
  });

  test('without permission nothing is scheduled', async () => {
    for (const permission of ['denied', 'undetermined'] as const) {
      const { reminders, pending } = setup(permission);
      await reminders.syncAll([ride()], copy, 0);
      expect(await pending()).toEqual([]);
    }
  });

  test('provisional permission schedules quietly', async () => {
    const { reminders, pending } = setup('provisional');
    await reminders.syncAll([ride()], copy, 0);
    expect((await pending()).length).toBe(1);
  });

  test('a time that has passed is not scheduled', async () => {
    const { reminders, pending } = setup('allowed', my(DEPART) - 20 * MINUTE);
    await reminders.syncAll([ride()], copy, 0);
    expect(await pending()).toEqual([]);
  });

  test('a reminder whose time passed counts as sent; the next one stays scheduled', async () => {
    const dueSince = new Date(my('2026-11-04T10:30:00')).toISOString();
    const owing = ride({
      status: 'settling',
      myStatus: 'boarded',
      share: { minor: 2470, currency: 'MYR' },
      dueSince,
    });
    const { reminders, advance } = setup('allowed', my('2026-11-04T11:00:00'));
    await reminders.syncAll([owing], copy, 0);
    const ids = new Set([reminderId('r1', 'pay24'), reminderId('r1', 'pay72')]);
    const read = (now: number) => reminderTimes(reminders.ledger.get(), (id) => ids.has(id), now);
    expect(read(my('2026-11-04T11:00:00'))).toEqual({
      sentAt: null,
      nextAt: my('2026-11-05T10:30:00'),
    });
    advance(26 * HOUR);
    await reminders.syncAll([owing], copy, 0);
    expect(read(my('2026-11-05T13:00:00'))).toEqual({
      sentAt: my('2026-11-05T10:30:00'),
      nextAt: my('2026-11-07T10:30:00'),
    });
  });

  test('a reminder cancelled before its time was never sent', () => {
    const inScope = (id: string) => id.startsWith('ride:r1:');
    const next = nextLedger(
      [{ id: reminderId('r1', 'pay24'), at: 2_000 }],
      { inScope, cancelled: [reminderId('r1', 'pay24')], scheduled: [], keepRide: () => true },
      1_000,
    );
    expect(next).toEqual([]);
  });
});

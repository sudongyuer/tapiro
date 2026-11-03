import type { SettingsLike } from '@/features/place/originStore';
import { createStore } from '@/lib/store';
import { canSchedule } from '@/lib/notifications/permission';
import { applyNoticeDiff, noticeDiff } from '@/lib/notifications/reconcile';
import type { LocalNotice, NoticePermission, ScheduledNotice } from '@/lib/notifications/types';

import { nextLedger, readLedger, writeLedger, type LedgerEntry } from './ledger';
import {
  allRidesScope,
  planReminders,
  rideIdOf,
  rideScope,
  type PlannedReminder,
  type ReminderRide,
} from './plan';

export type ReminderDeps = {
  permission(): Promise<NoticePermission>;
  scheduler: {
    scheduled(): Promise<ScheduledNotice[]>;
    schedule(notice: LocalNotice): Promise<void>;
    cancel(id: string): Promise<void>;
  };
  settings: SettingsLike;
  now(): number;
  fresh?: boolean;
};

export type NoticeCopy = (reminder: PlannedReminder, ride: ReminderRide) => LocalNotice;

export function createRideReminders(deps: ReminderDeps) {
  if (deps.fresh) writeLedger(deps.settings, []);
  const ledger = createStore<LedgerEntry[]>(readLedger(deps.settings));
  let queue: Promise<void> = Promise.resolve();

  const run = (task: () => Promise<void>) => {
    queue = queue.then(task).catch(() => {});
    return queue;
  };

  const sync = (
    inScope: (id: string) => boolean,
    rides: readonly ReminderRide[],
    copy: NoticeCopy,
  ) =>
    run(async () => {
      const now = deps.now();
      const allowed = canSchedule(await deps.permission());
      const desired = allowed
        ? rides.flatMap((ride) => planReminders(ride).map((reminder) => copy(reminder, ride)))
        : [];
      const diff = noticeDiff(await deps.scheduler.scheduled(), desired, inScope, now);
      await applyNoticeDiff(deps.scheduler, diff);
      const known = new Set(rides.map((ride) => ride.id));
      const next = nextLedger(
        ledger.get(),
        {
          inScope,
          cancelled: diff.cancel,
          scheduled: diff.schedule.map(({ id, at }) => ({ id, at })),
          keepRide: (id) => known.has(rideIdOf(id) ?? ''),
        },
        now,
      );
      writeLedger(deps.settings, next);
      ledger.set(next);
    });

  return {
    syncAll: (rides: readonly ReminderRide[], copy: NoticeCopy) => sync(allRidesScope, rides, copy),
    syncRide: (rideId: string, ride: ReminderRide | null, copy: NoticeCopy) =>
      sync(rideScope(rideId), ride ? [ride] : [], copy),
    clear: () =>
      run(async () => {
        const scheduled = await deps.scheduler.scheduled();
        for (const item of scheduled) {
          if (allRidesScope(item.id)) await deps.scheduler.cancel(item.id);
        }
        writeLedger(deps.settings, []);
        ledger.set([]);
      }),
    ledger,
    settled: () => queue,
  };
}

export type RideReminders = ReturnType<typeof createRideReminders>;

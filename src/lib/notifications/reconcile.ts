import type { LocalNotice, NoticeScheduler, ScheduledNotice } from './types';

export type NoticeDiff = { cancel: string[]; schedule: LocalNotice[] };

const same = (scheduled: ScheduledNotice, notice: LocalNotice) =>
  scheduled.at === notice.at && scheduled.title === notice.title && scheduled.body === notice.body;

export function noticeDiff(
  scheduled: readonly ScheduledNotice[],
  desired: readonly LocalNotice[],
  inScope: (id: string) => boolean,
  now: number,
): NoticeDiff {
  const wanted = new Map(
    desired
      .filter((notice) => inScope(notice.id) && notice.at > now)
      .map((notice) => [notice.id, notice]),
  );
  const current = new Map(
    scheduled.filter((item) => inScope(item.id)).map((item) => [item.id, item]),
  );
  return {
    cancel: [...current.keys()].filter((id) => !wanted.has(id)),
    schedule: [...wanted.values()].filter((notice) => {
      const existing = current.get(notice.id);
      return !existing || !same(existing, notice);
    }),
  };
}

export async function applyNoticeDiff(
  scheduler: Pick<NoticeScheduler, 'schedule' | 'cancel'>,
  diff: NoticeDiff,
) {
  for (const id of diff.cancel) await scheduler.cancel(id);
  for (const notice of diff.schedule) await scheduler.schedule(notice);
}

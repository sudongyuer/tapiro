import type { LocalNotice, NoticePermission, Notices } from './types';

const PERMISSIONS: readonly NoticePermission[] = [
  'allowed',
  'provisional',
  'denied',
  'undetermined',
];

export type FixtureNoticeLog = (scheduled: LocalNotice[], asks: number) => void;

export function createFixtureNotices(
  permission: string | undefined,
  log: FixtureNoticeLog,
): Notices {
  let current: NoticePermission = PERMISSIONS.find((value) => value === permission) ?? 'allowed';
  let asks = 0;
  const pending = new Map<string, LocalNotice>();
  const record = () =>
    log(
      [...pending.values()].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id)),
      asks,
    );
  return {
    permission: async () => current,
    async askProvisional() {
      if (current === 'undetermined') current = 'provisional';
    },
    async askInContext() {
      if (current === 'undetermined' || current === 'provisional') {
        asks += 1;
        current = 'allowed';
        record();
      }
      return current;
    },
    scheduler: {
      scheduled: async () =>
        [...pending.values()].map(({ id, at, title, body }) => ({ id, at, title, body })),
      async schedule(notice) {
        pending.set(notice.id, notice);
        record();
      },
      async cancel(id) {
        pending.delete(id);
        record();
      },
    },
  };
}

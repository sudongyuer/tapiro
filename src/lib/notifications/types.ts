export type NoticeData = { kind: string; id: string };

export type LocalNotice = {
  id: string;
  at: number;
  title: string;
  body: string;
  data: NoticeData;
};

export type ScheduledNotice = { id: string; at: number | null; title: string; body: string };

export type NoticePermission = 'allowed' | 'provisional' | 'denied' | 'undetermined';

export type NoticeScheduler = {
  scheduled(): Promise<ScheduledNotice[]>;
  schedule(notice: LocalNotice): Promise<void>;
  cancel(id: string): Promise<void>;
};

export type Notices = {
  permission(): Promise<NoticePermission>;
  askProvisional(): Promise<void>;
  askInContext(): Promise<NoticePermission>;
  scheduler: NoticeScheduler;
};

import type { OutgoingPush, PushSender } from './handler.ts';

export type RecordedPushInsert = {
  queue_id: number;
  token: string;
  language: string;
  title: string;
  body: string;
  thread_id: string;
  data: { kind: string; id: string };
};

export type RecordingStore = {
  insert(rows: RecordedPushInsert[]): PromiseLike<{ error: unknown }>;
};

export function recordingSender(store: RecordingStore): PushSender {
  return {
    async send(pushes: OutgoingPush[]) {
      const { error } = await store.insert(
        pushes.map(({ queueId, language, message }) => ({
          queue_id: queueId,
          token: message.to,
          language,
          title: message.title,
          body: message.body,
          thread_id: message.threadId,
          data: message.data,
        })),
      );
      if (error) throw new Error('record_failed');
      return pushes.map(() => ({ ok: true as const }));
    },
  };
}

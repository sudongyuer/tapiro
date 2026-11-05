import type { SupabaseClient } from '@supabase/supabase-js';

import { toCount, toMessage, toReadAt, toReportId, toThreadPage, toThreadRead } from './parse';
import { PAGE_SIZE, type ChatService, type OutgoingImage, type SendFailure } from './types';

export const IMAGE_BUCKET = 'chat-images';
const SIGNED_URL_SECONDS = 600;

export type ChatImageFiles = {
  read(file: string): Promise<ArrayBuffer>;
  cached(path: string): string | null;
  download(url: string, path: string): Promise<string>;
};

const alreadyStored = (error: unknown) => {
  const { statusCode, code } = (error ?? {}) as { statusCode?: unknown; code?: unknown };
  return statusCode === '409' || code === 'KeyAlreadyExists';
};

export { PAGE_SIZE };

const FAILURES: Readonly<Record<string, SendFailure>> = {
  blocked: 'blocked',
  not_member: 'notMember',
  thread_not_found: 'notFound',
  invalid_message: 'invalid',
  client_id_reused: 'clientIdReused',
};

export function toSendFailure(error: unknown): SendFailure {
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === 'string' && Object.hasOwn(FAILURES, message)
    ? FAILURES[message]
    : 'failed';
}

function unwrap<T extends { data: unknown; error: unknown }>(result: T): T['data'] {
  if (result.error) throw result.error;
  return result.data;
}

export function createSupabaseChatService(
  client: SupabaseClient | null,
  files: ChatImageFiles,
): ChatService {
  const db = () => {
    if (!client) throw new Error('Supabase is not configured');
    return client;
  };
  // The object name comes from the client id, so a retry after a lost answer finds its own earlier upload.
  async function upload(image: OutgoingImage) {
    const { error } = await db()
      .storage.from(IMAGE_BUCKET)
      .upload(image.path, await files.read(image.file), { contentType: 'image/jpeg' });
    return !error || alreadyStored(error);
  }
  return {
    async listThreads(before, count = PAGE_SIZE) {
      return toThreadPage(unwrap(await db().rpc('list_threads', { before, max_count: count })));
    },
    async readThread(threadId, before) {
      return toThreadRead(
        unwrap(await db().rpc('read_thread', { thread: threadId, before, max_count: PAGE_SIZE })),
      );
    },
    async send(threadId, clientId, body, image) {
      try {
        if (image && !(await upload(image))) return { ok: false, failure: 'failed' };
        const { data, error } = await db().rpc('send_message', {
          thread: threadId,
          client_id: clientId,
          body,
          ...(image ? { image: image.path, width: image.width, height: image.height } : {}),
        });
        if (error) return { ok: false, failure: toSendFailure(error) };
        return { ok: true, message: toMessage(data) };
      } catch {
        return { ok: false, failure: 'failed' };
      }
    },
    async imageFile(path) {
      const cached = files.cached(path);
      if (cached) return cached;
      const signed = unwrap(
        await db().storage.from(IMAGE_BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS),
      );
      if (!signed?.signedUrl) throw new Error('no signed url');
      return files.download(signed.signedUrl, path);
    },
    async markRead(threadId, messageId) {
      return toReadAt(
        unwrap(await db().rpc('mark_read', { thread: threadId, message: messageId })),
      );
    },
    async unreadCount() {
      return toCount(unwrap(await db().rpc('unread_threads')));
    },
    async report({ userId, messageId, reason, note }) {
      return toReportId(
        unwrap(
          await db().rpc('report', {
            target_user: userId,
            message: messageId ?? null,
            reason,
            note,
          }),
        ),
      );
    },
  };
}

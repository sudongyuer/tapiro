import type { SupabaseClient } from '@supabase/supabase-js';

import { toCount, toMessage, toReadAt, toReportId, toThreadPage, toThreadRead } from './parse';
import { PAGE_SIZE, type ChatService, type SendFailure } from './types';

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

export function createSupabaseChatService(client: SupabaseClient | null): ChatService {
  const db = () => {
    if (!client) throw new Error('Supabase is not configured');
    return client;
  };
  return {
    async listThreads(before, count = PAGE_SIZE) {
      return toThreadPage(unwrap(await db().rpc('list_threads', { before, max_count: count })));
    },
    async readThread(threadId, before) {
      return toThreadRead(
        unwrap(await db().rpc('read_thread', { thread: threadId, before, max_count: PAGE_SIZE })),
      );
    },
    async send(threadId, clientId, body) {
      try {
        const { data, error } = await db().rpc('send_message', {
          thread: threadId,
          client_id: clientId,
          body,
        });
        if (error) return { ok: false, failure: toSendFailure(error) };
        return { ok: true, message: toMessage(data) };
      } catch {
        return { ok: false, failure: 'failed' };
      }
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

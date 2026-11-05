import type { FixtureVariant } from '@/lib/fixtureVariant';

import { fixtureThreads, FIXTURE_CHAT_USER_ID, type FixtureThread } from './fixtureThreads';
import type { ChatMessage, ChatService, ThreadSummary } from './types';

export const CHAT_FAIL_POINTS = ['list', 'thread', 'send', 'unread', 'markRead', 'report'] as const;
export type ChatFailPoint = (typeof CHAT_FAIL_POINTS)[number];

export type FixtureChatOptions = {
  variant: FixtureVariant;
  failFirst: readonly ChatFailPoint[];
  pageSize?: number;
  now?: () => Date;
  onCall?: (name: string, args: unknown) => void;
};

export function fixtureChatOptions(
  argument: (name: string) => string | undefined,
  variant: FixtureVariant,
): FixtureChatOptions {
  const fail = (argument('uiVerifyChatFail') ?? '').split(',').map((part) => part.trim());
  return { variant, failFirst: CHAT_FAIL_POINTS.filter((point) => fail.includes(point)) };
}

const summary = ({ messages, ...info }: FixtureThread): ThreadSummary => ({
  ...info,
  lastMessage: messages[0] ?? null,
});

const pageOf = <T>(rows: readonly T[], from: number, size: number) => ({
  rows: rows.slice(from, from + size),
  hasMore: rows.length > from + size,
});

export function createFixtureChatService({
  variant,
  failFirst,
  pageSize = 50,
  now = () => new Date(),
  onCall = () => undefined,
}: FixtureChatOptions): ChatService {
  const threads = fixtureThreads(variant, now());
  const failing = new Set<ChatFailPoint>(failFirst);
  const failOnce = (point: ChatFailPoint) => {
    if (!failing.delete(point)) return;
    throw new Error(`fixture ${point} failed`);
  };
  const find = (threadId: string) => {
    const thread = threads.find((candidate) => candidate.id === threadId);
    if (!thread) throw new Error('thread_not_found');
    return thread;
  };
  const ordered = () =>
    [...threads].sort((a, b) =>
      (b.messages[0]?.createdAt ?? b.createdAt).localeCompare(
        a.messages[0]?.createdAt ?? a.createdAt,
      ),
    );
  const unread = (thread: FixtureThread) =>
    thread.messages.some(
      (message) =>
        message.senderId !== FIXTURE_CHAT_USER_ID &&
        (thread.lastReadAt === null || message.createdAt > thread.lastReadAt),
    );

  return {
    async listThreads(before) {
      onCall('listThreads', { before });
      failOnce('list');
      const rows = ordered();
      const from = before ? rows.findIndex((row) => row.id === before) + 1 : 0;
      const page = pageOf(rows, from, pageSize);
      return {
        items: page.rows.map((row) => summary({ ...row, unread: unread(row) })),
        hasMore: page.hasMore,
        nextCursor: page.hasMore ? (page.rows.at(-1)?.id ?? null) : null,
      };
    },
    async readThread(threadId, before) {
      onCall('readThread', { threadId, before });
      failOnce('thread');
      const thread = find(threadId);
      const from = before ? thread.messages.findIndex((message) => message.id === before) + 1 : 0;
      const page = pageOf(thread.messages, from, pageSize);
      const { messages: _messages, ...info } = thread;
      return {
        thread: { ...info, unread: unread(thread) },
        messages: page.rows,
        hasMore: page.hasMore,
      };
    },
    async send(threadId, clientId, body) {
      onCall('send', { threadId, clientId, body });
      if (failing.delete('send')) return { ok: false, failure: 'failed' };
      const thread = find(threadId);
      const existing = thread.messages.find((message) => message.clientId === clientId);
      if (existing) return { ok: true, message: existing };
      const message: ChatMessage = {
        id: `fixture-sent-${clientId}`,
        threadId,
        senderId: FIXTURE_CHAT_USER_ID,
        clientId,
        body,
        createdAt: now().toISOString(),
      };
      thread.messages.unshift(message);
      return { ok: true, message };
    },
    async markRead(threadId, messageId) {
      onCall('markRead', { threadId, messageId });
      failOnce('markRead');
      const thread = find(threadId);
      const shown = thread.messages.find((message) => message.id === messageId);
      if (!shown) throw new Error('message_not_found');
      if (thread.lastReadAt === null || shown.createdAt > thread.lastReadAt) {
        thread.lastReadAt = shown.createdAt;
      }
      return thread.lastReadAt;
    },
    async unreadCount() {
      onCall('unreadCount', {});
      failOnce('unread');
      return threads.filter(unread).length;
    },
    async report(input) {
      onCall('report', input);
      failOnce('report');
      return `fixture-report-${input.messageId ?? input.userId}`;
    },
  };
}

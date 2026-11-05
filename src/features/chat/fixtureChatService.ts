import type { FixtureVariant } from '@/lib/fixtureVariant';

import { fixtureThreads, FIXTURE_CHAT_USER_ID, type FixtureThread } from './fixtureThreads';
import type { ChatMessage, ChatService, ThreadSummary } from './types';

export const CHAT_FAIL_POINTS = [
  'list',
  'listRefresh',
  'listMore',
  'thread',
  'send',
  'unread',
  'markRead',
  'report',
] as const;
export type ChatFailPoint = (typeof CHAT_FAIL_POINTS)[number];

export type FixtureChatOptions = {
  variant: FixtureVariant;
  failFirst: readonly ChatFailPoint[];
  long?: boolean;
  left?: boolean;
  sendDelayMs?: number;
  pageSize?: number;
  now?: () => Date;
  onCall?: (name: string, args: unknown) => void;
};

export function fixtureChatOptions(
  argument: (name: string) => string | undefined,
  variant: FixtureVariant,
): FixtureChatOptions {
  const fail = (argument('uiVerifyChatFail') ?? '').split(',').map((part) => part.trim());
  return {
    variant,
    failFirst: CHAT_FAIL_POINTS.filter((point) => fail.includes(point)),
    long: argument('uiVerifyChatLong') === '1',
    left: argument('uiVerifyChatLeft') === '1',
    sendDelayMs: Number(argument('uiVerifyChatSendDelay') ?? 0) || 0,
  };
}

const newestFirst = (a: ChatMessage, b: ChatMessage) => b.createdAt.localeCompare(a.createdAt);

const pageOf = <T>(rows: readonly T[], from: number, size: number) => ({
  rows: rows.slice(from, from + size),
  hasMore: rows.length > from + size,
});

export function createFixtureChatService({
  variant,
  failFirst,
  long = false,
  left = false,
  sendDelayMs = 0,
  pageSize = 50,
  now = () => new Date(),
  onCall = () => undefined,
}: FixtureChatOptions): ChatService {
  const threads = fixtureThreads(variant, now(), long).map((thread) =>
    left && thread.kind === 'ride' ? { ...thread, left: true } : thread,
  );
  // Fixture lines dated in the future stay hidden until their time, so a later read shows them arriving.
  const shown = (thread: FixtureThread) => {
    const at = now().toISOString();
    return thread.messages.filter((message) => message.createdAt <= at);
  };
  const summary = (thread: FixtureThread): ThreadSummary => {
    const { messages: _messages, ...info } = thread;
    return { ...info, lastMessage: shown(thread)[0] ?? null };
  };
  const failing = new Set<ChatFailPoint>(failFirst);
  let listed = 0;
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
      (shown(b)[0]?.createdAt ?? b.createdAt).localeCompare(shown(a)[0]?.createdAt ?? a.createdAt),
    );
  const unread = (thread: FixtureThread) =>
    shown(thread).some(
      (message) =>
        message.senderId !== FIXTURE_CHAT_USER_ID &&
        (thread.lastReadAt === null || message.createdAt > thread.lastReadAt),
    );

  return {
    async listThreads(before, count = pageSize) {
      onCall('listThreads', { before, count });
      failOnce('list');
      if (before) failOnce('listMore');
      else if (listed++ > 0) failOnce('listRefresh');
      const rows = ordered();
      const from = before ? rows.findIndex((row) => row.id === before) + 1 : 0;
      const page = pageOf(rows, from, count);
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
      const messages = shown(thread);
      const from = before ? messages.findIndex((message) => message.id === before) + 1 : 0;
      const page = pageOf(messages, from, pageSize);
      const { messages: _messages, ...info } = thread;
      return {
        thread: { ...info, unread: unread(thread) },
        messages: page.rows,
        hasMore: page.hasMore,
      };
    },
    async send(threadId, clientId, body) {
      onCall('send', { threadId, clientId, body });
      if (sendDelayMs > 0) await new Promise((resolve) => setTimeout(resolve, sendDelayMs));
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
      thread.messages = [message, ...thread.messages].sort(newestFirst);
      return { ok: true, message };
    },
    async markRead(threadId, messageId) {
      onCall('markRead', { threadId, messageId });
      failOnce('markRead');
      const thread = find(threadId);
      const read = thread.messages.find((message) => message.id === messageId);
      if (!read) throw new Error('message_not_found');
      if (thread.lastReadAt === null || read.createdAt > thread.lastReadAt) {
        thread.lastReadAt = read.createdAt;
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

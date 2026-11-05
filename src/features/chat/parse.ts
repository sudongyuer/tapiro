import {
  THREAD_KINDS,
  type ChatMember,
  type ChatMessage,
  type ThreadInfo,
  type ThreadPage,
  type ThreadRead,
  type ThreadSummary,
} from './types';

const fail = (what: string): never => {
  throw new Error(`chat: unexpected ${what}`);
};

const body = (value: unknown, what: string) =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : fail(what);

const text = (value: unknown, what: string) =>
  typeof value === 'string' && value.length > 0 ? value : fail(what);

const textOrNull = (value: unknown, what: string) =>
  value === null || value === undefined ? null : text(value, what);

const flag = (value: unknown, what: string) => (typeof value === 'boolean' ? value : fail(what));

const list = (value: unknown, what: string) => (Array.isArray(value) ? value : fail(what));

export function toMessage(value: unknown): ChatMessage {
  const row = body(value, 'message');
  return {
    id: text(row.id, 'message id'),
    threadId: text(row.threadId, 'message threadId'),
    senderId: text(row.senderId, 'message senderId'),
    clientId: text(row.clientId, 'message clientId'),
    body: text(row.body, 'message body'),
    createdAt: text(row.createdAt, 'message createdAt'),
  };
}

function toMember(value: unknown): ChatMember {
  const row = body(value, 'member');
  return {
    id: text(row.id, 'member id'),
    name: textOrNull(row.name, 'member name'),
    avatarUrl: textOrNull(row.avatarUrl, 'member avatarUrl'),
    left: flag(row.left, 'member left'),
  };
}

function toThreadInfo(value: unknown): ThreadInfo {
  const row = body(value, 'thread');
  const kind = THREAD_KINDS.find((candidate) => candidate === row.kind) ?? fail('thread kind');
  return {
    id: text(row.id, 'thread id'),
    kind,
    itemId: text(row.itemId, 'thread itemId'),
    createdAt: text(row.createdAt, 'thread createdAt'),
    left: flag(row.left, 'thread left'),
    unread: flag(row.unread, 'thread unread'),
    lastReadAt: textOrNull(row.lastReadAt, 'thread lastReadAt'),
    peerReadAt: kind === 'bounty' ? textOrNull(row.peerReadAt, 'thread peerReadAt') : null,
    members: list(row.members, 'thread members').map(toMember),
  };
}

function toSummary(value: unknown): ThreadSummary {
  const row = body(value, 'thread row');
  const last = row.lastMessage;
  return {
    ...toThreadInfo(row),
    lastMessage: last === null || last === undefined ? null : toMessage(last),
  };
}

export function toThreadPage(value: unknown): ThreadPage {
  const page = body(value, 'thread page');
  const hasMore = flag(page.hasMore, 'thread page hasMore');
  return {
    items: list(page.items, 'thread page items').map(toSummary),
    hasMore,
    nextCursor: hasMore ? text(page.nextCursor, 'thread page cursor') : null,
  };
}

export function toThreadRead(value: unknown): ThreadRead {
  const read = body(value, 'thread read');
  return {
    thread: toThreadInfo(read.thread),
    messages: list(read.messages, 'thread messages').map(toMessage),
    hasMore: flag(read.hasMore, 'thread read hasMore'),
  };
}

export function toReadAt(value: unknown): string {
  return text(body(value, 'mark read').lastReadAt, 'lastReadAt');
}

export function toCount(value: unknown): number {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : fail('unread count');
}

export function toReportId(value: unknown): string {
  return text(body(value, 'report').id, 'report id');
}

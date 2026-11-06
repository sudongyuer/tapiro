import { bountyCategory } from '@/lib/stickers/category';

import {
  BOUNTY_SHOWN_STATUSES,
  RIDE_PHASES,
  THREAD_KINDS,
  type ChatImage,
  type ChatMember,
  type ChatSubject,
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

const side = (value: unknown, what: string) =>
  Number.isInteger(value) && Number(value) > 0 ? Number(value) : fail(what);

function toImage(value: unknown): ChatImage | null {
  if (value === null || value === undefined) return null;
  const row = body(value, 'message image');
  return {
    path: text(row.path, 'image path'),
    width: side(row.width, 'image width'),
    height: side(row.height, 'image height'),
  };
}

export function toMessage(value: unknown): ChatMessage {
  const row = body(value, 'message');
  const image = toImage(row.image);
  return {
    id: text(row.id, 'message id'),
    threadId: text(row.threadId, 'message threadId'),
    senderId: text(row.senderId, 'message senderId'),
    clientId: text(row.clientId, 'message clientId'),
    body: image && row.body === '' ? '' : text(row.body, 'message body'),
    image,
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
    blockedByMe: flag(row.blockedByMe, 'member blockedByMe'),
    organiser: flag(row.organiser, 'member organiser'),
  };
}

function toSubject(kind: ThreadInfo['kind'], value: unknown): ChatSubject {
  const row = body(value, 'thread item');
  if (kind === 'bounty') {
    return {
      kind,
      title: text(row.title, 'bounty title'),
      category: bountyCategory(row.category) ?? 'other',
      art: textOrNull(row.art, 'bounty art'),
      status: BOUNTY_SHOWN_STATUSES.find((value) => value === row.status) ?? fail('bounty status'),
    };
  }
  return {
    kind,
    from: text(row.from, 'ride from'),
    to: text(row.to, 'ride to'),
    departsAt: text(row.departsAt, 'ride departsAt'),
    status: RIDE_PHASES.find((value) => value === row.status) ?? fail('ride status'),
  };
}

function toThreadInfo(value: unknown): ThreadInfo {
  const row = body(value, 'thread');
  const kind = THREAD_KINDS.find((candidate) => candidate === row.kind) ?? fail('thread kind');
  return {
    id: text(row.id, 'thread id'),
    kind,
    itemId: text(row.itemId, 'thread itemId'),
    item: toSubject(kind, row.item),
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

export function toThreadId(value: unknown): string | null {
  return value === null || value === undefined ? null : text(body(value, 'thread').id, 'thread id');
}

import type { ChatMessage, PendingMessage, ThreadInfo, ThreadItem } from './types';

const STAMP = /^(.+T\d{2}:\d{2}:\d{2})(?:\.(\d+))?(.*)$/;

// Postgres times carry microseconds; Date keeps milliseconds, and two messages can share one.
function toMicros(at: string) {
  const [, seconds = at, fraction = '', zone = ''] = STAMP.exec(at) ?? [];
  return Date.parse(seconds + zone) * 1000 + Number(fraction.slice(0, 6).padEnd(6, '0'));
}

export function compareTime(a: string, b: string) {
  return Math.sign(toMicros(a) - toMicros(b));
}

export function mergeNewest(
  existing: readonly ChatMessage[],
  fetched: readonly ChatMessage[],
  fetchedHasMore: boolean,
  existingHasMore: boolean,
): { messages: ChatMessage[]; hasMore: boolean } {
  const oldest = fetched.at(-1);
  if (!fetchedHasMore || !oldest) return { messages: [...fetched], hasMore: fetchedHasMore };
  const at = existing.findIndex((message) => message.id === oldest.id);
  if (at < 0) return { messages: [...fetched], hasMore: true };
  return { messages: [...fetched, ...existing.slice(at + 1)], hasMore: existingHasMore };
}

export function appendOlder(existing: readonly ChatMessage[], older: readonly ChatMessage[]) {
  const known = new Set(existing.map((message) => message.id));
  return [...existing, ...older.filter((message) => !known.has(message.id))];
}

export function deliveredClientIds(
  messages: readonly ChatMessage[],
  pending: readonly PendingMessage[],
  me: string,
) {
  const stored = new Set(
    messages.filter((message) => message.senderId === me).map((message) => message.clientId),
  );
  return pending.filter((entry) => stored.has(entry.clientId)).map((entry) => entry.clientId);
}

export function threadItems(
  messages: readonly ChatMessage[],
  pending: readonly PendingMessage[],
  me: string,
): ThreadItem[] {
  const stored = new Set(
    messages.filter((message) => message.senderId === me).map((message) => message.clientId),
  );
  const waiting = pending
    .filter((entry) => !stored.has(entry.clientId))
    .sort((a, b) => compareTime(b.writtenAt, a.writtenAt));
  return [
    ...waiting.map((entry): ThreadItem => ({
      kind: 'pending',
      key: entry.clientId,
      pending: entry,
    })),
    ...messages.map((message): ThreadItem => ({
      kind: 'stored',
      key: message.senderId === me ? message.clientId : message.id,
      message,
      mine: message.senderId === me,
    })),
  ];
}

export function seenMessageId(
  thread: Pick<ThreadInfo, 'kind' | 'peerReadAt'>,
  messages: readonly ChatMessage[],
  me: string,
) {
  if (thread.kind !== 'bounty' || !thread.peerReadAt) return null;
  const mine = messages.find((message) => message.senderId === me);
  if (!mine) return null;
  return compareTime(thread.peerReadAt, mine.createdAt) >= 0 ? mine.id : null;
}

export function needsMarkRead(
  thread: Pick<ThreadInfo, 'lastReadAt'>,
  newest: ChatMessage | undefined,
) {
  if (!newest) return false;
  return thread.lastReadAt === null || compareTime(thread.lastReadAt, newest.createdAt) < 0;
}

export function hasUnread(lastReadAt: string | null, messages: readonly ChatMessage[], me: string) {
  const newest = messages.find((message) => message.senderId !== me);
  return (
    newest !== undefined && (lastReadAt === null || compareTime(lastReadAt, newest.createdAt) < 0)
  );
}

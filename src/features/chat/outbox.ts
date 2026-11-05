import { SEND_FAILURES, type PendingMessage, type SendFailure } from './types';

export type SettingsLike = {
  get(key: string): unknown;
  set(values: Record<string, unknown>): void;
};

const key = (userId: string) => `tapiro.chatOutbox.${userId}`;

const isFailure = (value: unknown): value is SendFailure =>
  (SEND_FAILURES as readonly unknown[]).includes(value);

// A message still 'sending' when the app stopped has an unknown outcome: it comes back failed so that only the
// user's tap sends it again (never replayed automatically).
function toPending(value: unknown): PendingMessage | null {
  const row = value as Partial<Record<keyof PendingMessage, unknown>> | null;
  if (typeof row !== 'object' || row === null) return null;
  const { clientId, threadId, body, writtenAt, failure } = row;
  if (typeof clientId !== 'string' || typeof threadId !== 'string') return null;
  if (typeof body !== 'string' || typeof writtenAt !== 'string') return null;
  return {
    clientId,
    threadId,
    body,
    writtenAt,
    state: 'failed',
    failure: isFailure(failure) ? failure : 'failed',
  };
}

function read(settings: SettingsLike, userId: string): PendingMessage[] {
  const raw = settings.get(key(userId));
  if (typeof raw !== 'string' || raw === '') return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((value) => toPending(value) ?? []);
  } catch {
    return [];
  }
}

export function createOutbox(settings: SettingsLike) {
  const cache = new Map<string, PendingMessage[]>();
  const load = (userId: string) => {
    let entries = cache.get(userId);
    if (!entries) {
      entries = read(settings, userId);
      cache.set(userId, entries);
    }
    return entries;
  };
  const save = (userId: string, entries: PendingMessage[]) => {
    cache.set(userId, entries);
    settings.set({ [key(userId)]: entries.length === 0 ? '' : JSON.stringify(entries) });
  };
  return {
    list: (userId: string): readonly PendingMessage[] => load(userId),
    put(userId: string, entry: PendingMessage) {
      const rest = load(userId).filter((item) => item.clientId !== entry.clientId);
      save(userId, [...rest, entry]);
    },
    remove(userId: string, clientIds: readonly string[]) {
      const entries = load(userId);
      const next = entries.filter((item) => !clientIds.includes(item.clientId));
      if (next.length !== entries.length) save(userId, next);
    },
    clear(userId: string) {
      save(userId, []);
    },
  };
}

export type Outbox = ReturnType<typeof createOutbox>;

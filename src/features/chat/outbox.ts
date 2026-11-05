import { SEND_FAILURES, type PendingImage, type PendingMessage, type SendFailure } from './types';

export type SettingsLike = {
  get(key: string): unknown;
  set(values: Record<string, unknown>): void;
};

const key = (userId: string) => `tapiro.chatOutbox.${userId}`;

const isFailure = (value: unknown): value is SendFailure =>
  (SEND_FAILURES as readonly unknown[]).includes(value);

const positive = (value: unknown): value is number => Number.isInteger(value) && Number(value) > 0;

function toImage(value: unknown): PendingImage | null | undefined {
  if (value === null || value === undefined) return null;
  const row = value as Partial<Record<keyof PendingImage, unknown>>;
  if (typeof row.file !== 'string' || row.file === '') return undefined;
  if (!positive(row.width) || !positive(row.height)) return undefined;
  return { file: row.file, width: row.width, height: row.height };
}

// A message still 'sending' when the app stopped has an unknown outcome: it comes back failed so that only the
// user's tap sends it again (never replayed automatically).
function toPending(value: unknown): PendingMessage | null {
  const row = value as Partial<Record<keyof PendingMessage, unknown>> | null;
  if (typeof row !== 'object' || row === null) return null;
  const { clientId, threadId, body, writtenAt, failure } = row;
  if (typeof clientId !== 'string' || typeof threadId !== 'string') return null;
  if (typeof body !== 'string' || typeof writtenAt !== 'string') return null;
  const image = toImage(row.image);
  if (image === undefined) return null;
  return {
    clientId,
    threadId,
    body,
    image,
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

// onDrop lets the caller delete an entry's image file once the entry leaves the outbox; the store moves a delivered
// image into the image cache before removing its entry, so dropping it then finds nothing.
export function createOutbox(
  settings: SettingsLike,
  onDrop: (entry: PendingMessage) => void = () => undefined,
) {
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
      if (next.length === entries.length) return;
      save(userId, next);
      for (const entry of entries) if (clientIds.includes(entry.clientId)) onDrop(entry);
    },
    clear(userId: string) {
      const entries = load(userId);
      save(userId, []);
      for (const entry of entries) onDrop(entry);
    },
  };
}

export type Outbox = ReturnType<typeof createOutbox>;

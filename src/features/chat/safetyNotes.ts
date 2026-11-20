import { createStore } from '@/lib/store';

import type { SettingsLike } from './outbox';

const key = (userId: string) => `tapiro.chatSafetyHidden.${userId}`;

function read(settings: SettingsLike, userId: string): ReadonlySet<string> {
  const raw = settings.get(key(userId));
  if (typeof raw !== 'string' || raw === '') return new Set();
  try {
    const parsed: unknown = JSON.parse(raw);
    return new Set(
      Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [],
    );
  } catch {
    return new Set();
  }
}

export function createSafetyNotes(settings: SettingsLike) {
  const hidden = new Map<string, ReadonlySet<string>>();
  const version = createStore(0);
  const load = (userId: string) => {
    let threads = hidden.get(userId);
    if (!threads) {
      threads = read(settings, userId);
      hidden.set(userId, threads);
    }
    return threads;
  };
  return {
    subscribe: version.subscribe,
    version: version.get,
    hidden: (userId: string, threadId: string) => load(userId).has(threadId),
    hide(userId: string, threadId: string) {
      const threads = load(userId);
      if (threads.has(threadId)) return;
      const next = new Set([...threads, threadId]);
      hidden.set(userId, next);
      settings.set({ [key(userId)]: JSON.stringify([...next]) });
      version.set(version.get() + 1);
    },
    clear(userId: string) {
      hidden.delete(userId);
      settings.set({ [key(userId)]: '' });
      version.set(version.get() + 1);
    },
  };
}

export type SafetyNotes = ReturnType<typeof createSafetyNotes>;

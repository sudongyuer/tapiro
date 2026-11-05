import type { SettingsLike } from './outbox';

const key = (userId: string) => `tapiro.chatDrafts.${userId}`;

function read(settings: SettingsLike, userId: string): Record<string, string> {
  const raw = settings.get(key(userId));
  if (typeof raw !== 'string' || raw === '') return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    );
  } catch {
    return {};
  }
}

export function createDrafts(settings: SettingsLike) {
  const cache = new Map<string, Record<string, string>>();
  const load = (userId: string) => {
    let drafts = cache.get(userId);
    if (!drafts) {
      drafts = read(settings, userId);
      cache.set(userId, drafts);
    }
    return drafts;
  };
  const save = (userId: string, drafts: Record<string, string>) => {
    cache.set(userId, drafts);
    settings.set({ [key(userId)]: Object.keys(drafts).length === 0 ? '' : JSON.stringify(drafts) });
  };
  return {
    get: (userId: string, threadId: string) => load(userId)[threadId] ?? '',
    set(userId: string, threadId: string, text: string) {
      const drafts = load(userId);
      if ((drafts[threadId] ?? '') === text) return;
      const { [threadId]: _dropped, ...rest } = drafts;
      save(userId, text === '' ? rest : { ...rest, [threadId]: text });
    },
    clear(userId: string) {
      save(userId, {});
    },
  };
}

export type Drafts = ReturnType<typeof createDrafts>;

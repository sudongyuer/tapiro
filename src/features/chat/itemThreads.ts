import type { ChatState } from './chatState';
import type { ChatService, ThreadInfo, ThreadKind } from './types';

export type ItemThread =
  { kind: 'found'; threadId: string } | { kind: 'none' } | { kind: 'failed' };

const matches = (info: ThreadInfo | null | undefined, kind: ThreadKind, itemId: string) =>
  info?.kind === kind && info.itemId === itemId;

export function loadedThreadId(state: ChatState, kind: ThreadKind, itemId: string) {
  const open = Object.values(state.threads).find((thread) => matches(thread.info, kind, itemId));
  if (open?.info) return open.info.id;
  if (state.list.status === 'idle') return null;
  return state.list.threads.find((row) => matches(row, kind, itemId))?.id ?? null;
}

export function createItemThreads(find: ChatService['findThread'], getState: () => ChatState) {
  const found = new Map<string, string>();
  let owner: string | null = null;
  const cache = () => {
    const { userId } = getState();
    if (userId !== owner) {
      found.clear();
      owner = userId;
    }
    return found;
  };
  const known = (kind: ThreadKind, itemId: string): string | null =>
    cache().get(`${kind}:${itemId}`) ?? loadedThreadId(getState(), kind, itemId);
  return {
    known,
    async lookup(kind: ThreadKind, itemId: string): Promise<ItemThread> {
      const loaded = known(kind, itemId);
      if (loaded) return { kind: 'found', threadId: loaded };
      const asked = getState().userId;
      try {
        const threadId = await find(kind, itemId);
        if (!threadId) return { kind: 'none' };
        if (getState().userId === asked) cache().set(`${kind}:${itemId}`, threadId);
        return { kind: 'found', threadId };
      } catch {
        return { kind: 'failed' };
      }
    },
  };
}

export type ItemThreads = ReturnType<typeof createItemThreads>;

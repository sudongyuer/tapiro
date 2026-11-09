import { createAnswerOrder } from '@/lib/answerOrder';
import { onReturnToForeground, type AppStateSource } from '@/lib/foreground';
import type { LiveSignal } from '@/lib/live';
import { createStore } from '@/lib/store';

import { withBlock } from './blockMark';
import {
  canSend,
  cleanBody,
  failedOrStale,
  IDLE,
  staleIfReady,
  type ChatState,
  type ThreadState,
} from './chatState';
import type { Outbox } from './outbox';
import {
  appendOlder,
  compareTime,
  deliveredClientIds,
  hasUnread,
  mergeNewest,
  needsMarkRead,
} from './threadModel';
import {
  imagePath,
  LIST_RELOAD_MAX,
  PAGE_SIZE,
  type ChatMessage,
  type ChatService,
  type PendingImage,
  type PendingMessage,
  type ReportInput,
  type SendResult,
} from './types';

export {
  canSend,
  cleanBody,
  type ChatState,
  type ListState,
  type ThreadState,
  type UnreadState,
} from './chatState';

export function createChatStore({
  service,
  outbox,
  newId,
  now = () => new Date(),
  keepImage = () => undefined,
}: {
  service: ChatService;
  outbox: Outbox;
  newId: () => string;
  now?: () => Date;
  keepImage?: (file: string, path: string) => void;
}) {
  const store = createStore<ChatState>(IDLE);
  const listOrder = createAnswerOrder();
  const unreadOrder = createAnswerOrder();
  const threadRequests = new Map<string, number>();
  const focused = new Map<string, number>();
  const sending = new Set<string>();
  const marking = new Set<string>();
  let generation = 0;
  let visibility: AppStateSource | null = null;
  let listVersion = 0;
  let reloadsOut = 0;
  let pagesAsked = 0;
  // onEndReached fires once per content length, so a next page refused or dropped around a reload is never asked again.
  let moreWanted = false;

  const get = store.get;
  const patch = (next: Partial<ChatState>) => store.set({ ...get(), ...next });
  const current = (userId: string, at: number) => at === generation && get().userId === userId;

  function setThread(threadId: string, next: ThreadState) {
    patch({ threads: { ...get().threads, [threadId]: next } });
  }

  function syncPending(userId: string) {
    patch({ pending: [...outbox.list(userId)] });
  }

  async function reloadList(userId = get().userId) {
    if (!userId) return;
    const at = generation;
    const request = listOrder.start();
    const loaded = get().list;
    const count = Math.min(
      LIST_RELOAD_MAX,
      Math.max(PAGE_SIZE, loaded.status === 'idle' ? 0 : loaded.threads.length),
    );
    reloadsOut += 1;
    try {
      const page = await service.listThreads(null, count);
      const status = listOrder.succeeded(request);
      if (!status || !current(userId, at)) return;
      listVersion += 1;
      patch({
        list: {
          status,
          threads: page.items,
          hasMore: page.hasMore,
          nextCursor: page.nextCursor,
          more: 'idle',
          loadedAt: now().toISOString(),
        },
      });
    } catch {
      if (!listOrder.failed(request) || !current(userId, at)) return;
      const list = get().list;
      if (list.status === 'idle') return;
      patch({ list: { ...list, status: failedOrStale(list.status, list.threads.length > 0) } });
    } finally {
      reloadsOut -= 1;
      if (moreWanted && reloadsOut === 0) {
        moreWanted = false;
        void loadMoreThreads();
      }
    }
  }

  async function loadList(userId: string) {
    const list = get().list;
    if (list.status === 'ready' || list.status === 'stale' || list.status === 'loading') {
      if (list.status === 'stale') await reloadList(userId);
      return;
    }
    patch({
      list: {
        status: 'loading',
        threads: [],
        hasMore: false,
        nextCursor: null,
        more: 'idle',
        loadedAt: null,
      },
    });
    await reloadList(userId);
  }

  async function loadMoreThreads() {
    const { userId, list } = get();
    if (!userId || (list.status !== 'ready' && list.status !== 'stale')) return;
    if (!list.hasMore || list.more === 'loading') return;
    // A reload sized before this page landed would replace the list with fewer rows.
    if (reloadsOut > 0) {
      moreWanted = true;
      return;
    }
    const at = generation;
    const version = listVersion;
    const request = ++pagesAsked;
    patch({ list: { ...list, more: 'loading' } });
    const page = await service.listThreads(list.nextCursor).catch(() => null);
    const latest = get().list;
    if (!current(userId, at) || request !== pagesAsked || latest.status === 'idle') return;
    const again = version !== listVersion || (!page && reloadsOut > 0);
    if (!page || again) {
      patch({ list: { ...latest, more: again ? 'idle' : 'failed' } });
      if (again) void loadMoreThreads();
      return;
    }
    const known = new Set(latest.threads.map((thread) => thread.id));
    patch({
      list: {
        ...latest,
        threads: [...latest.threads, ...page.items.filter((thread) => !known.has(thread.id))],
        hasMore: page.hasMore,
        nextCursor: page.nextCursor,
        more: 'idle',
      },
    });
  }

  async function refreshUnread(userId = get().userId) {
    if (!userId) return;
    const at = generation;
    const request = unreadOrder.start();
    if (get().unread.status === 'idle') patch({ unread: { status: 'loading', count: null } });
    try {
      const count = await service.unreadCount();
      const status = unreadOrder.succeeded(request);
      if (status && current(userId, at)) patch({ unread: { status, count } });
    } catch {
      if (!unreadOrder.failed(request) || !current(userId, at)) return;
      const unread = get().unread;
      if (unread.status === 'idle') return;
      patch({ unread: { ...unread, status: failedOrStale(unread.status, unread.count !== null) } });
    }
  }

  async function markRead(threadId: string) {
    const { userId, threads } = get();
    const thread = threads[threadId];
    const newest = thread?.messages[0];
    if (!userId || !thread?.info || !needsMarkRead(thread.info, newest)) return;
    if (visibility?.currentState && visibility.currentState !== 'active') return;
    if (!newest || marking.has(threadId)) return;
    const at = generation;
    marking.add(threadId);
    let marked = false;
    try {
      const lastReadAt = await service.markRead(threadId, newest.id);
      if (!current(userId, at)) return;
      marked = true;
      const latest = get().threads[threadId];
      const unread = hasUnread(lastReadAt, latest?.messages ?? [], userId);
      if (latest?.info)
        setThread(threadId, { ...latest, info: { ...latest.info, lastReadAt, unread } });
      const list = get().list;
      if (list.status !== 'idle') {
        const threadsRead = list.threads.map((row) =>
          row.id === threadId ? { ...row, lastReadAt, unread } : row,
        );
        patch({ list: { ...list, threads: threadsRead } });
      }
      void refreshUnread(userId);
    } catch {
    } finally {
      if (at === generation) marking.delete(threadId);
    }
    if (marked && focused.has(threadId)) void markRead(threadId);
  }

  async function reloadThread(threadId: string) {
    const userId = get().userId;
    if (!userId) return;
    const at = generation;
    const request = (threadRequests.get(threadId) ?? 0) + 1;
    threadRequests.set(threadId, request);
    const latestRequest = () => threadRequests.get(threadId) === request;
    const before = get().threads[threadId];
    if (before?.status === 'failed' && !before.info)
      setThread(threadId, { ...before, status: 'loading' });
    try {
      const read = await service.readThread(threadId, null);
      if (!latestRequest() || !current(userId, at)) return;
      const existing = get().threads[threadId];
      const merged = mergeNewest(
        existing?.messages ?? [],
        read.messages,
        read.hasMore,
        existing?.hasMore ?? read.hasMore,
      );
      setThread(threadId, {
        status: 'ready',
        info: read.thread,
        messages: merged.messages,
        hasMore: merged.hasMore,
        older: existing?.older === 'loading' ? 'loading' : 'idle',
        loadedAt: now().toISOString(),
        reloadFailed: false,
      });
      const delivered = deliveredClientIds(merged.messages, outbox.list(userId), userId);
      if (delivered.length > 0) {
        for (const entry of outbox.list(userId)) {
          const stored = merged.messages.find(
            (message) => message.senderId === userId && message.clientId === entry.clientId,
          );
          if (entry.image && stored?.image) keepImage(entry.image.file, stored.image.path);
        }
        outbox.remove(userId, delivered);
        syncPending(userId);
      }
      if (focused.has(threadId)) void markRead(threadId);
    } catch {
      if (!latestRequest() || !current(userId, at)) return;
      const existing = get().threads[threadId];
      setThread(threadId, {
        status: failedOrStale(existing?.status ?? 'loading', existing?.info != null),
        info: existing?.info ?? null,
        messages: existing?.messages ?? [],
        hasMore: existing?.hasMore ?? false,
        older: existing?.older ?? 'idle',
        loadedAt: existing?.loadedAt ?? null,
        reloadFailed: true,
      });
    }
  }

  async function loadOlder(threadId: string) {
    const userId = get().userId;
    const thread = get().threads[threadId];
    const oldest = thread?.messages.at(-1);
    if (!userId || !thread || !oldest || !thread.hasMore || thread.older === 'loading') return;
    const at = generation;
    setThread(threadId, { ...thread, older: 'loading' });
    try {
      const read = await service.readThread(threadId, oldest.id);
      const latest = get().threads[threadId];
      if (!current(userId, at) || !latest) return;
      if (latest.messages.at(-1)?.id !== oldest.id)
        return setThread(threadId, { ...latest, older: 'idle' });
      setThread(threadId, {
        ...latest,
        messages: appendOlder(latest.messages, read.messages),
        hasMore: read.hasMore,
        older: 'idle',
      });
    } catch {
      const latest = get().threads[threadId];
      if (current(userId, at) && latest) setThread(threadId, { ...latest, older: 'failed' });
    }
  }

  function openThread(threadId: string) {
    focused.set(threadId, (focused.get(threadId) ?? 0) + 1);
    if (!get().threads[threadId]) {
      setThread(threadId, {
        status: 'loading',
        info: null,
        messages: [],
        hasMore: false,
        older: 'idle',
        loadedAt: null,
        reloadFailed: false,
      });
    }
    void reloadThread(threadId);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const left = (focused.get(threadId) ?? 1) - 1;
      if (left > 0) focused.set(threadId, left);
      else focused.delete(threadId);
    };
  }

  function storeSent(userId: string, message: ChatMessage, entry: PendingMessage) {
    if (entry.image && message.image) keepImage(entry.image.file, message.image.path);
    outbox.remove(userId, [message.clientId]);
    syncPending(userId);
    const thread = get().threads[message.threadId];
    if (thread && !thread.messages.some((stored) => stored.id === message.id)) {
      const messages = [...thread.messages, message].sort(
        (a, b) => compareTime(b.createdAt, a.createdAt) || (a.id < b.id ? 1 : -1),
      );
      setThread(message.threadId, { ...thread, messages });
    }
    // A read already in flight may predate this message; reloading supersedes its answer.
    if (thread) void reloadThread(message.threadId);
    if (get().list.status !== 'idle') void reloadList(userId);
  }

  async function deliver(userId: string, entry: PendingMessage) {
    const at = generation;
    sending.add(entry.clientId);
    outbox.put(userId, { ...entry, state: 'sending', failure: null });
    syncPending(userId);
    const image = entry.image
      ? { ...entry.image, path: imagePath(entry.threadId, userId, entry.clientId) }
      : null;
    const result = await service
      .send(entry.threadId, entry.clientId, entry.body, image)
      .catch((): SendResult => ({ ok: false, failure: 'failed' }));
    if (at !== generation) {
      const kept = outbox.list(userId).some((item) => item.clientId === entry.clientId);
      if (!kept || sending.has(entry.clientId)) return;
      if (result.ok) {
        if (entry.image && result.message.image)
          keepImage(entry.image.file, result.message.image.path);
        outbox.remove(userId, [entry.clientId]);
      } else outbox.put(userId, { ...entry, state: 'failed', failure: result.failure });
      if (get().userId === userId) syncPending(userId);
      return;
    }
    sending.delete(entry.clientId);
    if (result.ok) return storeSent(userId, result.message, entry);
    outbox.put(userId, { ...entry, state: 'failed', failure: result.failure });
    syncPending(userId);
  }

  function clear() {
    generation += 1;
    moreWanted = false;
    focused.clear();
    sending.clear();
    marking.clear();
    threadRequests.clear();
    store.set(IDLE);
  }

  function start(userId: string) {
    if (get().userId === userId) return;
    clear();
    for (const entry of outbox.list(userId)) {
      if (entry.state === 'sending')
        outbox.put(userId, { ...entry, state: 'failed', failure: 'failed' });
    }
    patch({ userId, pending: [...outbox.list(userId)] });
  }

  function refresh() {
    const { userId, list, threads } = get();
    if (!userId) return;
    if (list.status !== 'idle') void reloadList(userId);
    void refreshUnread(userId);
    for (const threadId of Object.keys(threads)) {
      if (focused.has(threadId)) void reloadThread(threadId);
      else setThread(threadId, staleIfReady(threads[threadId]));
    }
  }

  function onSignal(signal: LiveSignal | null) {
    if (!get().userId) return;
    if (signal === null) return refresh();
    const thread = get().threads[signal.id];
    if (signal.kind === 'chat.message') {
      void refreshUnread();
      if (get().list.status !== 'idle') void reloadList();
    }
    if (!thread) return;
    if (focused.has(signal.id)) void reloadThread(signal.id);
    else setThread(signal.id, staleIfReady(thread));
  }

  return {
    getSnapshot: get,
    subscribe: store.subscribe,
    clear,
    loadList(userId = get().userId) {
      if (userId) return loadList(userId);
    },
    reloadList: () => reloadList(),
    loadMoreThreads,
    refreshUnread: () => refreshUnread(),
    refresh,
    markBlocked(personId: string, blocked: boolean) {
      store.set(withBlock(get(), personId, blocked));
      refresh();
    },
    openThread,
    reloadThread,
    loadOlder,
    markRead,
    onSignal,
    send(threadId: string, body: string, image: PendingImage | null = null) {
      const userId = get().userId;
      if (!userId || (image ? cleanBody(body) !== '' && !canSend(body) : !canSend(body)))
        return null;
      const entry: PendingMessage = {
        clientId: newId(),
        threadId,
        body: cleanBody(body),
        image,
        writtenAt: now().toISOString(),
        state: 'sending',
        failure: null,
      };
      void deliver(userId, entry);
      return entry.clientId;
    },
    imageFile: (path: string) => service.imageFile(path),
    retry(clientId: string) {
      const userId = get().userId;
      const entry = get().pending.find((item) => item.clientId === clientId);
      if (!userId || !entry || entry.state !== 'failed' || sending.has(clientId)) return false;
      void deliver(userId, entry);
      return true;
    },
    discard(clientId: string) {
      const userId = get().userId;
      const entry = get().pending.find((item) => item.clientId === clientId);
      if (!userId || !entry || entry.state !== 'failed') return;
      outbox.remove(userId, [clientId]);
      syncPending(userId);
    },
    report: (input: ReportInput) => service.report(input),
    follow(userId: string | null, appState: AppStateSource) {
      if (!userId) {
        clear();
        return () => undefined;
      }
      start(userId);
      visibility = appState;
      void refreshUnread(userId);
      return onReturnToForeground(appState, refresh);
    },
  };
}

export type ChatStore = ReturnType<typeof createChatStore>;

import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import type { ChatState, ThreadState } from './chatStore';
import { chatStore } from './services';
import { seenMessageId, threadItems } from './threadModel';
import type { PendingMessage, ThreadInfo } from './types';

const NO_PENDING: readonly PendingMessage[] = [];

export function useLiveChat(userId: string | null) {
  useEffect(() => chatStore.follow(userId, AppState), [userId]);
}

function useChatState<T>(select: (state: ChatState) => T) {
  return useSyncExternalStore(chatStore.subscribe, () => select(chatStore.getSnapshot()));
}

export function useChatList() {
  const list = useChatState((state) => state.list);
  const userId = useChatState((state) => state.userId);
  useEffect(() => {
    if (userId) void chatStore.loadList(userId);
  }, [userId]);
  return list;
}

export function useChatUserId() {
  return useChatState((state) => state.userId);
}

export function useChatThreadInfo(threadId: string): ThreadInfo | null {
  return useChatState(
    (state) =>
      state.threads[threadId]?.info ??
      (state.list.status === 'idle'
        ? undefined
        : state.list.threads.find((row) => row.id === threadId)) ??
      null,
  );
}

export function useChatUnread() {
  return useChatState((state) => state.unread);
}

export function useChatThread(threadId: string) {
  const userId = useChatState((state) => state.userId);
  const thread: ThreadState | undefined = useChatState((state) => state.threads[threadId]);
  const pending = useChatState((state) => state.pending);
  useFocusEffect(
    useCallback(() => {
      if (userId) return chatStore.openThread(threadId);
    }, [threadId, userId]),
  );
  return useMemo(() => {
    const mine = pending.filter((entry) => entry.threadId === threadId);
    const messages = thread?.messages ?? [];
    const me = userId ?? '';
    return {
      thread,
      items: threadItems(messages, mine.length > 0 ? mine : NO_PENDING, me),
      seenMessageId: thread?.info ? seenMessageId(thread.info, messages, me) : null,
    };
  }, [thread, pending, threadId, userId]);
}

import {
  MESSAGE_MAX,
  type ChatMessage,
  type LoadStatus,
  type PendingMessage,
  type ThreadInfo,
  type ThreadSummary,
} from './types';

export type ListState =
  | { status: 'idle' }
  | {
      status: LoadStatus;
      threads: ThreadSummary[];
      hasMore: boolean;
      nextCursor: string | null;
      more: 'idle' | 'loading' | 'failed';
      loadedAt: string | null;
    };

export type UnreadState = { status: 'idle' } | { status: LoadStatus; count: number | null };

export type ThreadState = {
  status: LoadStatus;
  info: ThreadInfo | null;
  messages: ChatMessage[];
  hasMore: boolean;
  older: 'idle' | 'loading' | 'failed';
  loadedAt: string | null;
  reloadFailed: boolean;
};

export type ChatState = {
  userId: string | null;
  list: ListState;
  unread: UnreadState;
  threads: Readonly<Record<string, ThreadState>>;
  pending: readonly PendingMessage[];
};

export const IDLE: ChatState = {
  userId: null,
  list: { status: 'idle' },
  unread: { status: 'idle' },
  threads: {},
  pending: [],
};

const EDGE_SPACE = /^[\s\u00a0\u200b\ufeff]+|[\s\u00a0\u200b\ufeff]+$/g;

export const cleanBody = (body: string) => body.replace(EDGE_SPACE, '');

export const canSend = (body: string) => {
  const length = [...cleanBody(body)].length;
  return length > 0 && length <= MESSAGE_MAX;
};

export const staleIfReady = (thread: ThreadState): ThreadState =>
  thread.status === 'ready' ? { ...thread, status: 'stale' } : thread;

export const failedOrStale = (status: LoadStatus, hasData: boolean): LoadStatus =>
  hasData && status !== 'failed' && status !== 'loading' ? 'stale' : 'failed';

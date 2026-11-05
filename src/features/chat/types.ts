export const THREAD_KINDS = ['bounty', 'ride'] as const;
export type ThreadKind = (typeof THREAD_KINDS)[number];

export const REPORT_REASONS = [
  'harassment',
  'off_platform_payment',
  'inappropriate',
  'other',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const MESSAGE_MAX = 2000;
export const REPORT_NOTE_MAX = 500;

export type ChatMember = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  left: boolean;
};

export type ChatMessage = {
  id: string;
  threadId: string;
  senderId: string;
  clientId: string;
  body: string;
  createdAt: string;
};

export type ThreadInfo = {
  id: string;
  kind: ThreadKind;
  itemId: string;
  createdAt: string;
  left: boolean;
  unread: boolean;
  lastReadAt: string | null;
  peerReadAt: string | null;
  members: ChatMember[];
};

export type ThreadSummary = ThreadInfo & { lastMessage: ChatMessage | null };

export type ThreadPage = { items: ThreadSummary[]; hasMore: boolean; nextCursor: string | null };

export type ThreadRead = { thread: ThreadInfo; messages: ChatMessage[]; hasMore: boolean };

export const SEND_FAILURES = [
  'blocked',
  'notMember',
  'notFound',
  'invalid',
  'clientIdReused',
  'failed',
] as const;
export type SendFailure = (typeof SEND_FAILURES)[number];

export type SendResult = { ok: true; message: ChatMessage } | { ok: false; failure: SendFailure };

export type ReportTarget = { userId: string; messageId?: string | null };
export type ReportInput = ReportTarget & { reason: ReportReason | null; note: string | null };

export type ChatService = {
  listThreads(before: string | null): Promise<ThreadPage>;
  readThread(threadId: string, before: string | null): Promise<ThreadRead>;
  send(threadId: string, clientId: string, body: string): Promise<SendResult>;
  markRead(threadId: string, messageId: string): Promise<string>;
  unreadCount(): Promise<number>;
  report(input: ReportInput): Promise<string>;
};

export type PendingState = 'sending' | 'failed';

export type PendingMessage = {
  clientId: string;
  threadId: string;
  body: string;
  writtenAt: string;
  state: PendingState;
  failure: SendFailure | null;
};

export type LoadStatus = 'loading' | 'ready' | 'failed' | 'stale';

export type ThreadItem =
  | { kind: 'stored'; key: string; message: ChatMessage; mine: boolean }
  | { kind: 'pending'; key: string; pending: PendingMessage };

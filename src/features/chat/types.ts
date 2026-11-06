import type { ReportReason } from '@/lib/report';
import type { BountyCategory } from '@/lib/stickers/category';

export const THREAD_KINDS = ['bounty', 'ride'] as const;
export type ThreadKind = (typeof THREAD_KINDS)[number];

export { REPORT_NOTE_MAX, REPORT_REASONS, type ReportReason } from '@/lib/report';

export const MESSAGE_MAX = 2000;
export const PAGE_SIZE = 50;
export const LIST_RELOAD_MAX = 100;

export type ChatMember = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  left: boolean;
  blockedByMe: boolean;
  organiser: boolean;
};

export const IMAGE_MAX_EDGE = 2048;
export const IMAGE_QUALITY = 0.7;

export type ChatImage = { path: string; width: number; height: number };

export type ChatMessage = {
  id: string;
  threadId: string;
  senderId: string;
  clientId: string;
  body: string;
  image: ChatImage | null;
  createdAt: string;
};

export const BOUNTY_SHOWN_STATUSES = [
  'open',
  'assigned',
  'en_route',
  'done',
  'disputed',
  'confirmed',
  'settled',
  'closed',
  'cancelled',
] as const;
export const RIDE_PHASES = [
  'open',
  'gathering',
  'departed',
  'arrived',
  'settling',
  'closed',
  'cancelled',
  'expired',
] as const;

export type ChatSubject =
  | {
      kind: 'bounty';
      title: string;
      category: BountyCategory;
      art: string | null;
      status: (typeof BOUNTY_SHOWN_STATUSES)[number];
    }
  | {
      kind: 'ride';
      from: string;
      to: string;
      departsAt: string;
      status: (typeof RIDE_PHASES)[number];
    };

export type ThreadInfo = {
  id: string;
  kind: ThreadKind;
  itemId: string;
  item: ChatSubject;
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

export type PendingImage = { file: string; width: number; height: number };
export type OutgoingImage = PendingImage & { path: string };

export const imagePath = (threadId: string, senderId: string, clientId: string) =>
  `${threadId}/${senderId}/${clientId}.jpg`;

export type ChatService = {
  listThreads(before: string | null, count?: number): Promise<ThreadPage>;
  readThread(threadId: string, before: string | null): Promise<ThreadRead>;
  send(
    threadId: string,
    clientId: string,
    body: string,
    image: OutgoingImage | null,
  ): Promise<SendResult>;
  imageFile(path: string): Promise<string>;
  markRead(threadId: string, messageId: string): Promise<string>;
  unreadCount(): Promise<number>;
  report(input: ReportInput): Promise<string>;
  findThread(kind: ThreadKind, itemId: string): Promise<string | null>;
};

export type PendingState = 'sending' | 'failed';

export type PendingMessage = {
  clientId: string;
  threadId: string;
  body: string;
  image: PendingImage | null;
  writtenAt: string;
  state: PendingState;
  failure: SendFailure | null;
};

export type LoadStatus = 'loading' | 'ready' | 'failed' | 'stale';

export type ThreadItem =
  | { kind: 'stored'; key: string; message: ChatMessage; mine: boolean }
  | { kind: 'pending'; key: string; pending: PendingMessage };

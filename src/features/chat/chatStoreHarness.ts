import { createChatStore } from './chatStore';
import { createOutbox, type SettingsLike } from './outbox';
import type {
  ChatMessage,
  ChatService,
  SendResult,
  ThreadInfo,
  ThreadPage,
  ThreadRead,
} from './types';

export const ME = 'me';
export const PEER = 'peer';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

export const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

export const at = (n: number) => `2026-11-06T01:00:${String(n).padStart(2, '0')}.000000+00:00`;

export const msg = (n: number, from = PEER, clientId = `c${n}`): ChatMessage => ({
  id: `m${n}`,
  threadId: 't1',
  senderId: from,
  clientId,
  body: `body ${n}`,
  image: null,
  createdAt: at(n),
});

export const info = (over: Partial<ThreadInfo> = {}): ThreadInfo => ({
  id: 't1',
  kind: 'bounty',
  itemId: 'b1',
  item: { kind: 'bounty', title: '帮取快递', category: 'pickup', art: null, status: 'assigned' },
  createdAt: at(0),
  left: false,
  unread: true,
  lastReadAt: null,
  peerReadAt: null,
  members: [
    { id: PEER, name: '阿杰', avatarUrl: null, left: false, blockedByMe: false, organiser: false },
  ],
  ...over,
});

export function fakeService() {
  const calls: { name: string; args: unknown[] }[] = [];
  const queues = {
    listThreads: [] as Deferred<ThreadPage>[],
    readThread: [] as Deferred<ThreadRead>[],
    send: [] as Deferred<SendResult>[],
    markRead: [] as Deferred<string>[],
    unreadCount: [] as Deferred<number>[],
  };
  const call = <K extends keyof typeof queues>(name: K, args: unknown[]) => {
    calls.push({ name, args });
    const next = deferred<Awaited<(typeof queues)[K][number]['promise']>>();
    (queues[name] as Deferred<unknown>[]).push(next as Deferred<unknown>);
    return next.promise;
  };
  const service: ChatService = {
    listThreads: (...args) => call('listThreads', args),
    readThread: (...args) => call('readThread', args),
    send: (...args) => call('send', args),
    markRead: (...args) => call('markRead', args),
    unreadCount: () => call('unreadCount', []),
    report: async () => 'r1',
    imageFile: async (path) => `file:///cache/${path}`,
  };
  const named = (name: string) => calls.filter((entry) => entry.name === name);
  return { service, calls, queues, named };
}

export function memorySettings(): SettingsLike {
  const values: Record<string, unknown> = {};
  return { get: (key) => values[key], set: (next) => Object.assign(values, next) };
}

export const noAppState = { addEventListener: () => ({ remove: () => undefined }) };

export function setup(settings = memorySettings()) {
  const fake = fakeService();
  let ids = 0;
  const dropped: string[] = [];
  const kept: [string, string][] = [];
  const outbox = createOutbox(settings, (entry) => {
    if (entry.image) dropped.push(entry.image.file);
  });
  const store = createChatStore({
    service: fake.service,
    outbox,
    newId: () => `new${++ids}`,
    now: () => new Date('2026-11-06T02:00:00.000Z'),
    keepImage: (file, path) => kept.push([file, path]),
  });
  store.follow(ME, noAppState as never);
  fake.queues.unreadCount.shift()?.resolve(1);
  return { ...fake, store, outbox, settings, dropped, kept };
}

import { describe, expect, test } from 'bun:test';

import { badgeCount } from './badge';
import { canSend, createChatStore } from './chatStore';
import { createOutbox, type SettingsLike } from './outbox';
import type {
  ChatMessage,
  ChatService,
  SendResult,
  ThreadInfo,
  ThreadPage,
  ThreadRead,
} from './types';

const ME = 'me';
const PEER = 'peer';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const at = (n: number) => `2026-11-06T01:00:${String(n).padStart(2, '0')}.000000+00:00`;

const msg = (n: number, from = PEER, clientId = `c${n}`): ChatMessage => ({
  id: `m${n}`,
  threadId: 't1',
  senderId: from,
  clientId,
  body: `body ${n}`,
  createdAt: at(n),
});

const info = (over: Partial<ThreadInfo> = {}): ThreadInfo => ({
  id: 't1',
  kind: 'bounty',
  itemId: 'b1',
  createdAt: at(0),
  left: false,
  unread: true,
  lastReadAt: null,
  peerReadAt: null,
  members: [{ id: PEER, name: '阿杰', avatarUrl: null, left: false }],
  ...over,
});

function fakeService() {
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
  };
  const named = (name: string) => calls.filter((entry) => entry.name === name);
  return { service, calls, queues, named };
}

function memorySettings(): SettingsLike {
  const values: Record<string, unknown> = {};
  return { get: (key) => values[key], set: (next) => Object.assign(values, next) };
}

const noAppState = { addEventListener: () => ({ remove: () => undefined }) };

function setup(settings = memorySettings()) {
  const fake = fakeService();
  let ids = 0;
  const outbox = createOutbox(settings);
  const store = createChatStore({
    service: fake.service,
    outbox,
    newId: () => `new${++ids}`,
    now: () => new Date('2026-11-06T02:00:00.000Z'),
  });
  store.follow(ME, noAppState as never);
  fake.queues.unreadCount.shift()?.resolve(1);
  return { ...fake, store, outbox, settings };
}

async function openWith(ctx: ReturnType<typeof setup>, read: ThreadRead) {
  const release = ctx.store.openThread('t1');
  ctx.queues.readThread.at(-1)?.resolve(read);
  await settle();
  return release;
}

describe('sending', () => {
  test('a message is on the device before the request goes out, shown as sending', () => {
    const ctx = setup();
    expect(ctx.store.send('t1', '  你好  ')).toBe('new1');
    expect(ctx.outbox.list(ME)).toMatchObject([
      { clientId: 'new1', body: '你好', state: 'sending' },
    ]);
    expect(ctx.named('send')[0].args).toEqual(['t1', 'new1', '你好']);
    expect(ctx.store.getSnapshot().pending).toMatchObject([{ state: 'sending' }]);
  });

  test('blank or overlong text is not sent', () => {
    const ctx = setup();
    expect(ctx.store.send('t1', ' ​\n')).toBeNull();
    expect(canSend('好'.repeat(2000))).toBe(true);
    expect(canSend('好'.repeat(2001))).toBe(false);
    expect(ctx.named('send')).toHaveLength(0);
  });

  test('a stored message leaves the outbox and joins the open thread in order', async () => {
    const ctx = setup();
    await openWith(ctx, { thread: info(), messages: [msg(2), msg(1)], hasMore: false });
    ctx.store.send('t1', '到了');
    ctx.queues.send[0].resolve({ ok: true, message: { ...msg(3, ME, 'new1'), body: '到了' } });
    await settle();
    expect(ctx.outbox.list(ME)).toEqual([]);
    expect(ctx.store.getSnapshot().threads.t1.messages.map((m) => m.id)).toEqual([
      'm3',
      'm2',
      'm1',
    ]);
  });

  test('a failed send stays on the device as failed with its reason and is never sent again on its own', async () => {
    const ctx = setup();
    ctx.store.send('t1', '到了');
    ctx.queues.send[0].resolve({ ok: false, failure: 'blocked' });
    await settle();
    expect(ctx.store.getSnapshot().pending).toMatchObject([
      { state: 'failed', failure: 'blocked' },
    ]);
    ctx.store.onSignal(null);
    ctx.store.onSignal({ kind: 'chat.message', id: 't1', at: null });
    await openWith(ctx, { thread: info(), messages: [], hasMore: false });
    expect(ctx.named('send')).toHaveLength(1);
  });

  test('a retry is the same message under the same client id, only on the user’s tap', async () => {
    const ctx = setup();
    ctx.store.send('t1', '到了');
    ctx.queues.send[0].resolve({ ok: false, failure: 'failed' });
    await settle();
    expect(ctx.store.retry('new1')).toBe(true);
    expect(ctx.store.retry('new1')).toBe(false);
    expect(ctx.named('send').map((entry) => entry.args)).toEqual([
      ['t1', 'new1', '到了'],
      ['t1', 'new1', '到了'],
    ]);
    expect(ctx.store.getSnapshot().pending).toMatchObject([{ state: 'sending' }]);
  });

  test('a message that is still sending cannot be retried or discarded', () => {
    const ctx = setup();
    ctx.store.send('t1', '到了');
    expect(ctx.store.retry('new1')).toBe(false);
    ctx.store.discard('new1');
    expect(ctx.store.getSnapshot().pending).toHaveLength(1);
  });

  test('discarding a failed message removes it from the device', async () => {
    const ctx = setup();
    ctx.store.send('t1', '到了');
    ctx.queues.send[0].resolve({ ok: false, failure: 'failed' });
    await settle();
    ctx.store.discard('new1');
    expect(ctx.outbox.list(ME)).toEqual([]);
    expect(ctx.store.getSnapshot().pending).toEqual([]);
  });

  test('a thread load that shows a waiting message as stored settles it without sending', async () => {
    const settings = memorySettings();
    const first = setup(settings);
    first.store.send('t1', '到了');
    const ctx = setup(settings);
    expect(ctx.store.getSnapshot().pending).toMatchObject([{ clientId: 'new1', state: 'failed' }]);
    await openWith(ctx, { thread: info(), messages: [msg(5, ME, 'new1')], hasMore: false });
    expect(ctx.store.getSnapshot().pending).toEqual([]);
    expect(ctx.named('send')).toHaveLength(0);
  });

  test('an answer that arrives after signing out still lands in that user’s outbox', async () => {
    const ctx = setup();
    ctx.store.send('t1', '到了');
    ctx.store.follow(null, noAppState as never);
    ctx.queues.send[0].resolve({ ok: false, failure: 'failed' });
    await settle();
    expect(ctx.store.getSnapshot().pending).toEqual([]);
    expect(ctx.outbox.list(ME)).toMatchObject([{ clientId: 'new1', state: 'failed' }]);
  });
});

describe('threads', () => {
  test('a thread that fails to load is failed, not empty; a later failure keeps what was shown as stale', async () => {
    const ctx = setup();
    const release = ctx.store.openThread('t1');
    expect(ctx.store.getSnapshot().threads.t1.status).toBe('loading');
    ctx.queues.readThread[0].reject(new Error('offline'));
    await settle();
    expect(ctx.store.getSnapshot().threads.t1).toMatchObject({ status: 'failed', info: null });
    void ctx.store.reloadThread('t1');
    ctx.queues.readThread[1].resolve({ thread: info(), messages: [msg(1)], hasMore: false });
    await settle();
    void ctx.store.reloadThread('t1');
    ctx.queues.readThread.at(-1)?.reject(new Error('offline'));
    await settle();
    expect(ctx.store.getSnapshot().threads.t1).toMatchObject({ status: 'stale' });
    expect(ctx.store.getSnapshot().threads.t1.messages).toHaveLength(1);
    release();
  });

  test('an older answer never overwrites a newer one', async () => {
    const ctx = setup();
    ctx.store.openThread('t1');
    void ctx.store.reloadThread('t1');
    ctx.queues.readThread[1].resolve({
      thread: info(),
      messages: [msg(2), msg(1)],
      hasMore: false,
    });
    await settle();
    ctx.queues.readThread[0].resolve({ thread: info(), messages: [msg(1)], hasMore: false });
    await settle();
    expect(ctx.store.getSnapshot().threads.t1.messages.map((m) => m.id)).toEqual(['m2', 'm1']);
  });

  test('older pages load from the oldest shown message', async () => {
    const ctx = setup();
    await openWith(ctx, { thread: info(), messages: [msg(3), msg(2)], hasMore: true });
    void ctx.store.loadOlder('t1');
    expect(ctx.named('readThread').at(-1)?.args).toEqual(['t1', 'm2']);
    ctx.queues.readThread.at(-1)?.resolve({ thread: info(), messages: [msg(1)], hasMore: false });
    await settle();
    expect(ctx.store.getSnapshot().threads.t1).toMatchObject({ hasMore: false, older: 'idle' });
    expect(ctx.store.getSnapshot().threads.t1.messages.map((m) => m.id)).toEqual([
      'm3',
      'm2',
      'm1',
    ]);
  });

  test('a chat.message for the open thread reloads it; for a closed one it only goes stale', async () => {
    const ctx = setup();
    const release = await openWith(ctx, { thread: info(), messages: [msg(1)], hasMore: false });
    ctx.queues.markRead.shift()?.resolve(at(1));
    await settle();
    const reads = ctx.named('readThread').length;
    ctx.store.onSignal({ kind: 'chat.message', id: 't1', at: null });
    expect(ctx.named('readThread')).toHaveLength(reads + 1);
    expect(ctx.named('unreadCount').length).toBeGreaterThan(1);
    release();
    ctx.store.onSignal({ kind: 'chat.read', id: 't1', at: null });
    expect(ctx.named('readThread')).toHaveLength(reads + 1);
    expect(ctx.store.getSnapshot().threads.t1.status).toBe('stale');
  });
});

describe('read state', () => {
  test('an open thread is marked read up to its newest message, then the badge refreshes', async () => {
    const ctx = setup();
    await openWith(ctx, { thread: info(), messages: [msg(2), msg(1)], hasMore: false });
    expect(ctx.named('markRead').map((entry) => entry.args)).toEqual([['t1', 'm2']]);
    const counts = ctx.named('unreadCount').length;
    ctx.queues.markRead[0].resolve(at(2));
    await settle();
    expect(ctx.store.getSnapshot().threads.t1.info).toMatchObject({
      lastReadAt: at(2),
      unread: false,
    });
    expect(ctx.named('unreadCount')).toHaveLength(counts + 1);
  });

  test('a new message while the thread is open is marked read too; a read thread is not marked again', async () => {
    const ctx = setup();
    await openWith(ctx, {
      thread: info({ lastReadAt: at(1) }),
      messages: [msg(1)],
      hasMore: false,
    });
    expect(ctx.named('markRead')).toHaveLength(0);
    ctx.store.onSignal({ kind: 'chat.message', id: 't1', at: null });
    ctx.queues.readThread.at(-1)?.resolve({
      thread: info({ lastReadAt: at(1) }),
      messages: [msg(2), msg(1)],
      hasMore: false,
    });
    await settle();
    expect(ctx.named('markRead').map((entry) => entry.args)).toEqual([['t1', 'm2']]);
  });

  test('a thread that is not open is never marked read', async () => {
    const ctx = setup();
    const release = ctx.store.openThread('t1');
    release();
    ctx.queues.readThread[0].resolve({ thread: info(), messages: [msg(1)], hasMore: false });
    await settle();
    expect(ctx.named('markRead')).toHaveLength(0);
  });

  test('the badge counts unread threads, hides while signed out, and keeps its count when a refresh fails', async () => {
    const ctx = setup();
    await settle();
    expect(badgeCount(ctx.store.getSnapshot())).toBe(1);
    void ctx.store.refreshUnread();
    ctx.queues.unreadCount.at(-1)?.reject(new Error('offline'));
    await settle();
    expect(ctx.store.getSnapshot().unread).toEqual({ status: 'stale', count: 1 });
    expect(badgeCount(ctx.store.getSnapshot())).toBe(1);
    ctx.store.follow(null, noAppState as never);
    expect(badgeCount(ctx.store.getSnapshot())).toBe(0);
  });
});

describe('thread list', () => {
  const row = (id: string) => ({ ...info({ id }), lastMessage: null });

  test('the list loads once, pages on, and never repeats a thread', async () => {
    const ctx = setup();
    void ctx.store.loadList();
    expect(ctx.store.getSnapshot().list.status).toBe('loading');
    ctx.queues.listThreads[0].resolve({
      items: [row('a'), row('b')],
      hasMore: true,
      nextCursor: 'k1',
    });
    await settle();
    void ctx.store.loadMoreThreads();
    expect(ctx.named('listThreads').at(-1)?.args).toEqual(['k1']);
    ctx.queues.listThreads[1].resolve({
      items: [row('b'), row('c')],
      hasMore: false,
      nextCursor: null,
    });
    await settle();
    const list = ctx.store.getSnapshot().list;
    expect(list.status === 'ready' && list.threads.map((thread) => thread.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  test('a list that fails to load is failed, not empty', async () => {
    const ctx = setup();
    void ctx.store.loadList();
    ctx.queues.listThreads[0].reject(new Error('offline'));
    await settle();
    expect(ctx.store.getSnapshot().list).toMatchObject({ status: 'failed', threads: [] });
  });

  test('a page that answers after the list was reloaded is dropped', async () => {
    const ctx = setup();
    void ctx.store.loadList();
    ctx.queues.listThreads[0].resolve({ items: [row('a')], hasMore: true, nextCursor: 'k1' });
    await settle();
    void ctx.store.loadMoreThreads();
    ctx.store.onSignal({ kind: 'chat.message', id: 'x', at: null });
    ctx.queues.listThreads[2].resolve({
      items: [row('z'), row('a')],
      hasMore: false,
      nextCursor: null,
    });
    await settle();
    ctx.queues.listThreads[1].resolve({ items: [row('b')], hasMore: false, nextCursor: null });
    await settle();
    const list = ctx.store.getSnapshot().list;
    expect(list.status !== 'idle' && list.threads.map((thread) => thread.id)).toEqual(['z', 'a']);
    expect(list.status !== 'idle' && list.more).toBe('idle');
  });
});

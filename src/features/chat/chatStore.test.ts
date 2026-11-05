import { describe, expect, test } from 'bun:test';

import { badgeCount } from './badge';
import { canSend } from './chatStore';
import { at, info, ME, memorySettings, msg, noAppState, settle, setup } from './chatStoreHarness';
import type { ThreadRead } from './types';

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

  test('a signal for the open thread reloads it; for a closed one it only goes stale', async () => {
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
    ctx.store.onSignal({ kind: 'chat.message', id: 't1', at: null });
    expect(ctx.named('readThread')).toHaveLength(reads + 1);
    expect(ctx.store.getSnapshot().threads.t1.status).toBe('stale');
  });

  test('a thread that never loaded stays failed on a signal, never stale and empty', async () => {
    const ctx = setup();
    const release = ctx.store.openThread('t1');
    ctx.queues.readThread[0].reject(new Error('offline'));
    await settle();
    release();
    ctx.store.onSignal({ kind: 'chat.message', id: 't1', at: null });
    ctx.store.onSignal(null);
    expect(ctx.store.getSnapshot().threads.t1.status).toBe('failed');
  });

  test('a read that started before your send cannot hide the sent message', async () => {
    const ctx = setup();
    await openWith(ctx, { thread: info(), messages: [msg(1)], hasMore: false });
    ctx.store.onSignal({ kind: 'chat.message', id: 't1', at: null });
    const before = ctx.queues.readThread.at(-1);
    ctx.store.send('t1', '到了');
    ctx.queues.send[0].resolve({ ok: true, message: msg(3, ME, 'new1') });
    await settle();
    before?.resolve({ thread: info(), messages: [msg(2), msg(1)], hasMore: false });
    await settle();
    expect(ctx.store.getSnapshot().threads.t1.messages.map((m) => m.id)).toContain('m3');
    ctx.queues.readThread.at(-1)?.resolve({
      thread: info(),
      messages: [msg(3, ME, 'new1'), msg(2), msg(1)],
      hasMore: false,
    });
    await settle();
    expect(ctx.store.getSnapshot().threads.t1.messages.map((m) => m.id)).toEqual([
      'm3',
      'm2',
      'm1',
    ]);
  });

  test('signing out and back in turns a message left sending into a failed one you can retry', async () => {
    const ctx = setup();
    ctx.store.send('t1', '到了');
    ctx.store.follow(null, noAppState as never);
    ctx.store.follow(ME, noAppState as never);
    expect(ctx.store.getSnapshot().pending).toMatchObject([{ clientId: 'new1', state: 'failed' }]);
    expect(ctx.store.retry('new1')).toBe(true);
    ctx.queues.send[0].resolve({ ok: false, failure: 'failed' });
    await settle();
    expect(ctx.store.getSnapshot().pending).toMatchObject([{ state: 'sending' }]);
  });

  test('an answer after the account was deleted writes nothing back to the device', async () => {
    const ctx = setup();
    ctx.store.send('t1', '到了');
    ctx.store.follow(null, noAppState as never);
    ctx.outbox.clear(ME);
    ctx.queues.send[0].resolve({ ok: false, failure: 'failed' });
    await settle();
    expect(ctx.outbox.list(ME)).toEqual([]);
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

  test('a message that arrives while a mark is in flight is marked next', async () => {
    const ctx = setup();
    await openWith(ctx, { thread: info(), messages: [msg(1)], hasMore: false });
    ctx.store.onSignal({ kind: 'chat.message', id: 't1', at: null });
    ctx.queues.readThread
      .at(-1)
      ?.resolve({ thread: info(), messages: [msg(2), msg(1)], hasMore: false });
    await settle();
    ctx.queues.markRead[0].resolve(at(1));
    await settle();
    expect(ctx.named('markRead').map((entry) => entry.args)).toEqual([
      ['t1', 'm1'],
      ['t1', 'm2'],
    ]);
    expect(ctx.store.getSnapshot().threads.t1.info?.unread).toBe(true);
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

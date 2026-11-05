import { describe, expect, test } from 'bun:test';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createSupabaseChatService, PAGE_SIZE } from './chatService';

type Answer = { data?: unknown; error?: unknown };

function stubClient(answer: (name: string) => Answer | Promise<never>) {
  const calls: { name: string; args: unknown }[] = [];
  const client = {
    rpc: async (name: string, args: unknown) => {
      calls.push({ name, args });
      return answer(name);
    },
  } as unknown as SupabaseClient;
  return { service: createSupabaseChatService(client), calls };
}

const MESSAGE = {
  id: 'm1',
  threadId: 't1',
  senderId: 'u1',
  clientId: 'c1',
  body: '你好',
  createdAt: '2026-11-06T01:00:00.123456+00:00',
};

const THREAD = {
  id: 't1',
  kind: 'bounty',
  itemId: 'b1',
  createdAt: '2026-11-06T00:00:00+00:00',
  left: false,
  unread: true,
  lastReadAt: null,
  peerReadAt: '2026-11-06T01:00:00.123456+00:00',
  members: [{ id: 'u2', name: null, avatarUrl: null, left: false }],
};

describe('supabase chat service', () => {
  test('lists threads by cursor and keeps the cursor only while there is more', async () => {
    const { service, calls } = stubClient(() => ({
      data: { items: [{ ...THREAD, lastMessage: MESSAGE }], hasMore: true, nextCursor: 'k1' },
    }));
    const page = await service.listThreads('k0');
    expect(calls).toEqual([{ name: 'list_threads', args: { before: 'k0', max_count: PAGE_SIZE } }]);
    expect(page.nextCursor).toBe('k1');
    expect(page.items[0].lastMessage?.body).toBe('你好');
    expect(page.items[0].members[0].name).toBeNull();
  });

  test('a ride thread never carries a read time for the others', async () => {
    const { service } = stubClient(() => ({
      data: { thread: { ...THREAD, kind: 'ride' }, messages: [MESSAGE], hasMore: false },
    }));
    expect((await service.readThread('t1', null)).thread.peerReadAt).toBeNull();
  });

  test('an unexpected shape is a failure, not an empty thread', async () => {
    const { service } = stubClient(() => ({
      data: { thread: THREAD, messages: null, hasMore: false },
    }));
    await expect(service.readThread('t1', null)).rejects.toThrow();
  });

  test('send maps server refusals to typed failures', async () => {
    for (const [message, failure] of [
      ['blocked', 'blocked'],
      ['not_member', 'notMember'],
      ['thread_not_found', 'notFound'],
      ['client_id_reused', 'clientIdReused'],
      ['something else', 'failed'],
    ] as const) {
      const { service } = stubClient(() => ({ error: { message } }));
      expect(await service.send('t1', 'c1', '你好')).toEqual({ ok: false, failure });
    }
  });

  test('a send whose answer is lost is failed, so the user can retry it', async () => {
    const { service, calls } = stubClient(() => Promise.reject(new Error('network')));
    expect(await service.send('t1', 'c1', '你好')).toEqual({ ok: false, failure: 'failed' });
    expect(calls[0]).toEqual({
      name: 'send_message',
      args: { thread: 't1', client_id: 'c1', body: '你好' },
    });
  });

  test('mark read, unread count and report call their functions', async () => {
    const answers: Record<string, unknown> = {
      mark_read: { lastReadAt: MESSAGE.createdAt },
      unread_threads: 2,
      report: { id: 'r1' },
    };
    const { service, calls } = stubClient((name) => ({ data: answers[name] }));
    expect(await service.markRead('t1', 'm1')).toBe(MESSAGE.createdAt);
    expect(await service.unreadCount()).toBe(2);
    expect(await service.report({ userId: 'u2', reason: null, note: null })).toBe('r1');
    expect(calls.map((call) => call.args)).toEqual([
      { thread: 't1', message: 'm1' },
      undefined,
      { target_user: 'u2', message: null, reason: null, note: null },
    ]);
  });

  test('a negative or fractional unread count is rejected', async () => {
    const { service } = stubClient(() => ({ data: -1 }));
    await expect(service.unreadCount()).rejects.toThrow();
  });
});

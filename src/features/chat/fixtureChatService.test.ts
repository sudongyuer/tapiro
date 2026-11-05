import { describe, expect, test } from 'bun:test';

import { createFixtureChatService, fixtureChatOptions } from './fixtureChatService';
import { FIXTURE_CHAT_USER_ID } from './fixtureThreads';

const NOW = () => new Date('2026-11-06T02:00:00.000Z');

describe('fixture chat service', () => {
  test('demo threads list newest activity first with unread state', async () => {
    const service = createFixtureChatService({ variant: 'demo', failFirst: [], now: NOW });
    const page = await service.listThreads(null);
    expect(page.items.map((row) => [row.id, row.unread])).toEqual([
      ['fixture-chat-bounty', true],
      ['fixture-chat-new', false],
      ['fixture-chat-ride', false],
    ]);
    expect(await service.unreadCount()).toBe(1);
  });

  test('reading up to the newest message clears the thread from the count', async () => {
    const service = createFixtureChatService({ variant: 'demo', failFirst: [], now: NOW });
    const read = await service.readThread('fixture-chat-bounty', null);
    await service.markRead('fixture-chat-bounty', read.messages[0].id);
    expect(await service.unreadCount()).toBe(0);
  });

  test('a send stores once per client id', async () => {
    const service = createFixtureChatService({ variant: 'one', failFirst: [], now: NOW });
    const first = await service.send('fixture-chat-bounty', 'c1', '好');
    const again = await service.send('fixture-chat-bounty', 'c1', '好');
    expect(first).toEqual(again);
    expect(first.ok && first.message.senderId).toBe(FIXTURE_CHAT_USER_ID);
    expect((await service.readThread('fixture-chat-bounty', null)).messages).toHaveLength(4);
  });

  test('a fail point fails only its first call', async () => {
    const options = fixtureChatOptions(
      (name) => (name === 'uiVerifyChatFail' ? 'list, send' : undefined),
      'demo',
    );
    const service = createFixtureChatService({ ...options, now: NOW });
    await expect(service.listThreads(null)).rejects.toThrow();
    expect((await service.listThreads(null)).items).toHaveLength(3);
    expect(await service.send('fixture-chat-bounty', 'c1', '好')).toEqual({
      ok: false,
      failure: 'failed',
    });
    expect((await service.send('fixture-chat-bounty', 'c1', '好')).ok).toBe(true);
  });

  test('the worst case pages its sixty-one threads and holds a message at the length limit', async () => {
    const service = createFixtureChatService({ variant: 'worst', failFirst: [], now: NOW });
    const first = await service.listThreads(null);
    expect(first).toMatchObject({ hasMore: true });
    const second = await service.listThreads(first.nextCursor);
    expect(first.items.length + second.items.length).toBe(61);
    expect(second.hasMore).toBe(false);
    const read = await service.readThread('fixture-chat-worst', null);
    expect([...read.messages[0].body].length).toBe(2000);
  });

  test('empty has no threads', async () => {
    const service = createFixtureChatService({ variant: 'empty', failFirst: [], now: NOW });
    expect((await service.listThreads(null)).items).toEqual([]);
  });
});

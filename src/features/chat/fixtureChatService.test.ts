import { describe, expect, test } from 'bun:test';

import { createFixtureChatService, fixtureChatOptions } from './fixtureChatService';
import { FIXTURE_CHAT_USER_ID, LONG_THREAD_ID } from './fixtureThreads';

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

  test('the worst case pages 120 threads, unread past the badge cap, with a message at the length limit', async () => {
    const service = createFixtureChatService({ variant: 'worst', failFirst: [], now: NOW });
    const pages = [await service.listThreads(null)];
    while (pages.at(-1)?.hasMore)
      pages.push(await service.listThreads(pages.at(-1)?.nextCursor ?? null));
    expect(pages.map((page) => page.items.length)).toEqual([50, 50, 20]);
    expect(await service.unreadCount()).toBeGreaterThan(99);
    const head = pages[0].items[0];
    expect(head.item.kind === 'bounty' && [...head.item.title].length).toBe(60);
    const read = await service.readThread('fixture-chat-worst', null);
    expect([...read.messages[0].body].length).toBe(2000);
  });

  test('demo rows carry their bounty or ride', async () => {
    const service = createFixtureChatService({ variant: 'demo', failFirst: [], now: NOW });
    const rows = (await service.listThreads(null)).items;
    expect(rows.map((row) => row.item)).toMatchObject([
      { kind: 'bounty', title: '帮取快递', category: 'pickup', art: null },
      { kind: 'bounty', title: '帮我买杯奶茶', art: 'tea' },
      { kind: 'ride', from: '双威', to: 'KLIA2' },
    ]);
  });

  test('listRefresh fails the first reload after a load, listMore the first next page', async () => {
    const options = fixtureChatOptions(
      (name) => (name === 'uiVerifyChatFail' ? 'listRefresh,listMore' : undefined),
      'worst',
    );
    const service = createFixtureChatService({ ...options, now: NOW });
    const first = await service.listThreads(null);
    await expect(service.listThreads(first.nextCursor)).rejects.toThrow();
    expect((await service.listThreads(first.nextCursor)).items).toHaveLength(50);
    await expect(service.listThreads(null)).rejects.toThrow();
    expect((await service.listThreads(null)).items).toHaveLength(50);
  });

  test('empty has no threads', async () => {
    const service = createFixtureChatService({ variant: 'empty', failFirst: [], now: NOW });
    expect((await service.listThreads(null)).items).toEqual([]);
  });

  test('the long thread holds back its two replies until their time, then shows them newest first', async () => {
    let at = new Date('2026-11-06T02:00:00.000Z');
    const service = createFixtureChatService({
      variant: 'demo',
      failFirst: [],
      long: true,
      now: () => at,
    });
    const before = await service.readThread(LONG_THREAD_ID, null);
    expect(before.messages).toHaveLength(44);
    const listed = (await service.listThreads(null)).items.find((row) => row.id === LONG_THREAD_ID);
    expect(listed?.lastMessage?.body).toBe('看到你了');

    const sent = await service.send(LONG_THREAD_ID, 'c-long', '好');
    at = new Date(at.getTime() + 41_000);
    const after = await service.readThread(LONG_THREAD_ID, null);
    expect(after.messages.slice(0, 3).map((message) => message.body)).toEqual([
      '记得确认一下哦',
      '箱子放你门口了',
      '好',
    ]);
    expect(sent.ok && sent.message.senderId).toBe(FIXTURE_CHAT_USER_ID);
  });

  test('the long thread is opt-in through its launch argument', () => {
    expect(fixtureChatOptions(() => undefined, 'demo').long).toBe(false);
    expect(
      fixtureChatOptions((name) => (name === 'uiVerifyChatLong' ? '1' : undefined), 'demo').long,
    ).toBe(true);
  });
});

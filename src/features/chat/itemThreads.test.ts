import { describe, expect, test } from 'bun:test';

import { IDLE, type ChatState, type ListState } from './chatState';
import { info } from './chatStoreHarness';
import { createItemThreads } from './itemThreads';

function harness(state: Partial<ChatState> = {}) {
  let current: ChatState = { ...IDLE, userId: 'me', ...state };
  const asked: [string, string][] = [];
  let answer: () => Promise<string | null> = async () => 't9';
  const threads = createItemThreads(
    (kind, itemId) => {
      asked.push([kind, itemId]);
      return answer();
    },
    () => current,
  );
  return {
    threads,
    asked,
    answer: (next: () => Promise<string | null>) => {
      answer = next;
    },
    become: (next: Partial<ChatState>) => {
      current = { ...current, ...next };
    },
  };
}

const listed = (over = {}): ListState => ({
  status: 'ready',
  threads: [{ ...info(over), lastMessage: null }],
  hasMore: false,
  nextCursor: null,
  more: 'idle',
  loadedAt: null,
});

describe('finding an item’s thread for the 发消息 entry', () => {
  test('a thread already in the 消息 list opens without asking the server', async () => {
    const h = harness({ list: listed({ id: 't1', kind: 'bounty', itemId: 'b1' }) });
    expect(h.threads.known('bounty', 'b1')).toBe('t1');
    expect(await h.threads.lookup('bounty', 'b1')).toEqual({ kind: 'found', threadId: 't1' });
    expect(h.asked).toEqual([]);
  });

  test('a bounty and a ride with the same id are different items', async () => {
    const h = harness({ list: listed({ id: 't1', kind: 'bounty', itemId: 'x' }) });
    expect(h.threads.known('ride', 'x')).toBeNull();
    expect(await h.threads.lookup('ride', 'x')).toEqual({ kind: 'found', threadId: 't9' });
    expect(h.asked).toEqual([['ride', 'x']]);
  });

  test('an open thread counts as known', () => {
    const h = harness({
      threads: {
        t2: {
          status: 'ready',
          info: info({ id: 't2', kind: 'ride', itemId: 'r1' }),
          messages: [],
          hasMore: false,
          older: 'idle',
          loadedAt: null,
          reloadFailed: false,
        },
      },
    });
    expect(h.threads.known('ride', 'r1')).toBe('t2');
  });

  test('a found thread is remembered, so the next tap opens at once', async () => {
    const h = harness();
    expect(await h.threads.lookup('bounty', 'b2')).toEqual({ kind: 'found', threadId: 't9' });
    expect(h.threads.known('bounty', 'b2')).toBe('t9');
    await h.threads.lookup('bounty', 'b2');
    expect(h.asked).toEqual([['bounty', 'b2']]);
  });

  test('no thread and a failed lookup are told apart and neither is remembered', async () => {
    const h = harness();
    h.answer(async () => null);
    expect(await h.threads.lookup('bounty', 'b3')).toEqual({ kind: 'none' });
    h.answer(async () => {
      throw new Error('offline');
    });
    expect(await h.threads.lookup('bounty', 'b3')).toEqual({ kind: 'failed' });
    expect(h.threads.known('bounty', 'b3')).toBeNull();
    expect(h.asked).toHaveLength(2);
  });

  test('another account on the device does not reuse the first account’s threads', async () => {
    const h = harness();
    await h.threads.lookup('bounty', 'b4');
    h.become({ userId: 'other' });
    expect(h.threads.known('bounty', 'b4')).toBeNull();
  });

  test('an answer that arrives after the account changed is not kept for the new account', async () => {
    const h = harness();
    let release!: (id: string) => void;
    h.answer(() => new Promise((resolve) => (release = resolve)));
    const pending = h.threads.lookup('bounty', 'b5');
    h.become({ userId: 'other' });
    release('t5');
    await pending;
    expect(h.threads.known('bounty', 'b5')).toBeNull();
  });
});

import { describe, expect, test } from 'bun:test';

import { withBlock } from './blockMark';
import { info, PEER } from './chatStoreHarness';
import type { ChatState, ThreadState } from './chatStore';

const thread = (over = {}): ThreadState => ({
  status: 'ready',
  info: info({ peerReadAt: '2026-11-06T01:00:00Z', ...over }),
  messages: [],
  hasMore: false,
  older: 'idle',
  loadedAt: null,
  reloadFailed: false,
});

const state = (): ChatState => ({
  userId: 'me',
  list: {
    status: 'ready',
    threads: [{ ...info(), lastMessage: null }],
    hasMore: false,
    nextCursor: null,
    more: 'idle',
    loadedAt: null,
  },
  unread: { status: 'idle' },
  threads: { t1: thread() },
  pending: [],
});

const peer = (value: ChatState) =>
  value.threads.t1?.info?.members.find((member) => member.id === PEER);

describe('a confirmed block or unblock', () => {
  test('marks the person in loaded threads and list rows at once and hides their read time', () => {
    const after = withBlock(state(), PEER, true);
    expect(peer(after)?.blockedByMe).toBe(true);
    expect(after.threads.t1?.info?.peerReadAt).toBeNull();
    const row = after.list.status === 'idle' ? null : after.list.threads[0];
    expect(row?.members[0].blockedByMe).toBe(true);
    expect(peer(withBlock(after, PEER, false))?.blockedByMe).toBe(false);
  });

  test('leaves threads without that person untouched', () => {
    const before = state();
    expect(withBlock(before, 'nobody', true).threads.t1).toBe(before.threads.t1);
  });
});

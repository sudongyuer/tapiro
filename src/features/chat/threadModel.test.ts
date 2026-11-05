import { describe, expect, test } from 'bun:test';

import {
  appendOlder,
  compareTime,
  deliveredClientIds,
  mergeNewest,
  needsMarkRead,
  seenMessageId,
  threadItems,
} from './threadModel';
import type { ChatMessage, PendingMessage } from './types';

const ME = 'me';

const msg = (
  n: number,
  from = 'peer',
  at = `2026-11-06T01:00:${String(n).padStart(2, '0')}.000000+00:00`,
) =>
  ({
    id: `m${n}`,
    threadId: 't1',
    senderId: from,
    clientId: `c${n}`,
    body: `body ${n}`,
    image: null,
    createdAt: at,
  }) satisfies ChatMessage;

const pending = (clientId: string, writtenAt: string, state: PendingMessage['state'] = 'failed') =>
  ({
    clientId,
    threadId: 't1',
    body: clientId,
    image: null,
    writtenAt,
    state,
    failure: state === 'failed' ? 'failed' : null,
  }) satisfies PendingMessage;

describe('compareTime', () => {
  test('orders Postgres times that share a millisecond by their microseconds', () => {
    expect(
      compareTime('2026-11-06T01:00:00.123900+00:00', '2026-11-06T01:00:00.123400+00:00'),
    ).toBe(1);
    expect(
      compareTime('2026-11-06T01:00:00.123400+00:00', '2026-11-06T01:00:00.123900+00:00'),
    ).toBe(-1);
  });

  test('treats the same instant in different notations as equal', () => {
    expect(compareTime('2026-11-06T01:00:00.5+00:00', '2026-11-06T09:00:00.500000+08:00')).toBe(0);
    expect(compareTime('2026-11-06T01:00:00Z', '2026-11-06T01:00:00.000Z')).toBe(0);
  });
});

describe('mergeNewest', () => {
  test('a complete first page replaces what was loaded', () => {
    const merged = mergeNewest([msg(3), msg(2), msg(1)], [msg(4), msg(3)], false, true);
    expect(merged.messages.map((m) => m.id)).toEqual(['m4', 'm3']);
    expect(merged.hasMore).toBe(false);
  });

  test('a partial first page keeps the older pages that follow it', () => {
    const merged = mergeNewest([msg(3), msg(2), msg(1)], [msg(4), msg(3)], true, false);
    expect(merged.messages.map((m) => m.id)).toEqual(['m4', 'm3', 'm2', 'm1']);
    expect(merged.hasMore).toBe(false);
  });

  test('a first page with a gap to what was loaded drops the older pages', () => {
    const merged = mergeNewest([msg(2), msg(1)], [msg(5), msg(4)], true, false);
    expect(merged.messages.map((m) => m.id)).toEqual(['m5', 'm4']);
    expect(merged.hasMore).toBe(true);
  });

  test('appending an older page skips messages already shown', () => {
    expect(appendOlder([msg(3), msg(2)], [msg(2), msg(1)]).map((m) => m.id)).toEqual([
      'm3',
      'm2',
      'm1',
    ]);
  });
});

describe('threadItems', () => {
  test('waiting messages come first, newest written first, then stored messages newest first', () => {
    const items = threadItems(
      [msg(2, ME), msg(1)],
      [
        pending('p1', '2026-11-06T01:01:00.000Z'),
        pending('p2', '2026-11-06T01:02:00.000Z', 'sending'),
      ],
      ME,
    );
    expect(items.map((item) => item.key)).toEqual(['p2', 'p1', 'c2', 'm1']);
    expect(items.map((item) => (item.kind === 'stored' ? item.mine : item.pending.state))).toEqual([
      'sending',
      'failed',
      true,
      false,
    ]);
  });

  test('a waiting message already stored shows once, as stored, under the same key', () => {
    const items = threadItems([msg(2, ME)], [pending('c2', '2026-11-06T01:01:00.000Z')], ME);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: 'stored', key: 'c2' });
  });

  test('only your own stored messages settle a waiting one', () => {
    const waiting = [
      pending('c1', '2026-11-06T01:01:00.000Z'),
      pending('c2', '2026-11-06T01:01:00.000Z'),
    ];
    expect(deliveredClientIds([msg(1), msg(2, ME)], waiting, ME)).toEqual(['c2']);
  });
});

describe('read state', () => {
  const at = (n: number) => `2026-11-06T01:00:${String(n).padStart(2, '0')}.000000+00:00`;

  test('已读 marks your latest message once the other side has read up to it, in a bounty thread', () => {
    const messages = [msg(3), msg(2, ME), msg(1, ME)];
    expect(seenMessageId({ kind: 'bounty', peerReadAt: at(2) }, messages, ME)).toBe('m2');
    expect(seenMessageId({ kind: 'bounty', peerReadAt: at(1) }, messages, ME)).toBeNull();
    expect(seenMessageId({ kind: 'bounty', peerReadAt: null }, messages, ME)).toBeNull();
  });

  test('a ride group never shows 已读', () => {
    expect(seenMessageId({ kind: 'ride', peerReadAt: at(9) }, [msg(2, ME)], ME)).toBeNull();
  });

  test('a thread needs marking only when its newest message is past the read time', () => {
    expect(needsMarkRead({ lastReadAt: null }, msg(1))).toBe(true);
    expect(needsMarkRead({ lastReadAt: at(1) }, msg(2))).toBe(true);
    expect(needsMarkRead({ lastReadAt: at(2) }, msg(2))).toBe(false);
    expect(needsMarkRead({ lastReadAt: null }, undefined)).toBe(false);
  });
});

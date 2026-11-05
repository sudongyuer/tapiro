import { describe, expect, test } from 'bun:test';

import { mergeFirstPage, type LoadedList } from './listModel';
import type { ThreadSummary } from './types';

const row = (id: string, minute: number): ThreadSummary => ({
  id,
  kind: 'bounty',
  itemId: `${id}-item`,
  item: { kind: 'bounty', title: '帮取快递', category: 'pickup', art: null, status: 'assigned' },
  createdAt: `2026-11-06T00:${String(minute).padStart(2, '0')}:00.000000+00:00`,
  left: false,
  unread: false,
  lastReadAt: null,
  peerReadAt: null,
  members: [],
  lastMessage: null,
});

const loaded: LoadedList = {
  threads: [row('a', 50), row('b', 40), row('c', 30), row('d', 20), row('e', 10)],
  hasMore: true,
  nextCursor: 'after-e',
};

const ids = (list: LoadedList) => list.threads.map((thread) => thread.id);

describe('reloading the first page of the thread list', () => {
  test('keeps the pages below when the new first page ends on a row already loaded', () => {
    const merged = mergeFirstPage(loaded, {
      items: [row('d', 59), row('a', 50), row('b', 40)],
      hasMore: true,
      nextCursor: 'after-b',
    });
    expect(ids(merged)).toEqual(['d', 'a', 'b', 'c', 'e']);
    expect(merged).toMatchObject({ hasMore: true, nextCursor: 'after-e' });
  });

  test('drops the pages below when rows may be missing between them', () => {
    const merged = mergeFirstPage(loaded, {
      items: [row('x', 59), row('y', 58), row('z', 57)],
      hasMore: true,
      nextCursor: 'after-z',
    });
    expect(ids(merged)).toEqual(['x', 'y', 'z']);
    expect(merged.nextCursor).toBe('after-z');
  });

  test('a row that moved since it was loaded does not count as joined', () => {
    const merged = mergeFirstPage(loaded, {
      items: [row('a', 50), row('b', 45)],
      hasMore: true,
      nextCursor: 'after-b',
    });
    expect(ids(merged)).toEqual(['a', 'b']);
  });

  test('a complete first page replaces everything', () => {
    const merged = mergeFirstPage(loaded, {
      items: [row('a', 50)],
      hasMore: false,
      nextCursor: null,
    });
    expect(ids(merged)).toEqual(['a']);
    expect(merged.hasMore).toBe(false);
  });
});

import type { ThreadPage, ThreadSummary } from './types';

export type LoadedList = { threads: ThreadSummary[]; hasMore: boolean; nextCursor: string | null };

export const activeAt = (row: ThreadSummary) => row.lastMessage?.createdAt ?? row.createdAt;

// A thread's sort key only grows (a new message moves it to the top), so once the fresh first page ends on a row the
// list already holds with the same key, every row loaded below it is still in order and none is missing.
export function mergeFirstPage(existing: LoadedList, page: ThreadPage): LoadedList {
  const fresh = { threads: page.items, hasMore: page.hasMore, nextCursor: page.nextCursor };
  const last = page.items.at(-1);
  if (!page.hasMore || !last) return fresh;
  const at = existing.threads.findIndex(
    (row) => row.id === last.id && activeAt(row) === activeAt(last),
  );
  if (at < 0) return fresh;
  const known = new Set(page.items.map((row) => row.id));
  return {
    threads: [...page.items, ...existing.threads.slice(at + 1).filter((row) => !known.has(row.id))],
    hasMore: existing.hasMore,
    nextCursor: existing.nextCursor,
  };
}

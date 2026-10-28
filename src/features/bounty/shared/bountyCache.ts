import { userCleanups } from '@/lib/userCleanups';

import type { BoardRow, BountyDetail } from '../board/types';

export type ApplicationChange = { id: string; applied: boolean; note: string | null };

export function createBountyCache() {
  const rows = new Map<string, BoardRow>();
  const details = new Map<string, BountyDetail>();
  const listeners = new Set<(change: ApplicationChange) => void>();

  function notify(change: ApplicationChange) {
    for (const listener of listeners) listener(change);
  }

  return {
    seed(next: BoardRow[]) {
      for (const row of next) rows.set(row.id, row);
    },
    row: (id: string) => rows.get(id) ?? null,
    detail: (id: string) => details.get(id) ?? null,
    setDetail(detail: BountyDetail) {
      details.set(detail.id, detail);
    },
    drop(id: string) {
      details.delete(id);
      rows.delete(id);
    },
    markApplied(id: string, note: string | null) {
      const row = rows.get(id);
      if (row) rows.set(id, { ...row, appliedByMe: true });
      const detail = details.get(id);
      if (detail) details.set(id, { ...detail, myApplication: { status: 'pending', note } });
      notify({ id, applied: true, note });
    },
    markWithdrawn(id: string) {
      const row = rows.get(id);
      if (row) rows.set(id, { ...row, appliedByMe: false });
      const detail = details.get(id);
      if (detail?.myApplication) {
        details.set(id, {
          ...detail,
          myApplication: { ...detail.myApplication, status: 'withdrawn' },
        });
      }
      notify({ id, applied: false, note: null });
    },
    onApplicationChange(listener: (change: ApplicationChange) => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    clear() {
      rows.clear();
      details.clear();
    },
  };
}

export type BountyCache = ReturnType<typeof createBountyCache>;

export const bountyCache = createBountyCache();

userCleanups.register(() => bountyCache.clear());

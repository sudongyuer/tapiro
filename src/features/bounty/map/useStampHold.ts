import { useIsFocused } from 'expo-router';
import { useEffect, useMemo, useSyncExternalStore } from 'react';

import type { BoardRow } from '../board/types';
import { justApplied } from '../shared/justApplied';

const RELEASE_FALLBACK_MS = 600;
const SURFACE = 'card';

export function useStampHold(rows: readonly BoardRow[]): ReadonlySet<string> {
  const focused = useIsFocused();
  const applied = rows.filter((row) => row.appliedByMe).map((row) => row.id);
  const held = useSyncExternalStore(justApplied.subscribe, () =>
    applied
      .filter((id) => {
        const entry = justApplied.entry(id, SURFACE);
        return entry === 'waiting' || (entry === 'ready' && !focused);
      })
      .join('\n'),
  );

  useEffect(() => {
    if (!focused) return;
    for (const id of applied) {
      if (justApplied.entry(id, SURFACE) === 'ready') justApplied.take(id, SURFACE);
    }
  });

  useEffect(() => {
    if (!focused || !held) return;
    const timer = setTimeout(
      () => held.split('\n').forEach((id) => justApplied.release(id, SURFACE)),
      RELEASE_FALLBACK_MS,
    );
    return () => clearTimeout(timer);
  }, [focused, held]);

  return useMemo(() => new Set(held ? held.split('\n') : []), [held]);
}

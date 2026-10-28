import { userCleanups } from '@/lib/userCleanups';

export type ApplySurface = 'card' | 'detail';

export function createJustApplied() {
  const pending = new Map<string, { surface: ApplySurface; shown: boolean }>();
  const listeners = new Set<() => void>();

  function changed() {
    for (const listener of listeners) listener();
  }

  return {
    set(id: string, surface: ApplySurface) {
      pending.set(id, { surface, shown: false });
      changed();
    },
    sheetGone() {
      let any = false;
      for (const entry of pending.values()) {
        if (!entry.shown) {
          entry.shown = true;
          any = true;
        }
      }
      if (any) changed();
    },
    entry(id: string, surface: ApplySurface): 'none' | 'waiting' | 'ready' {
      const entry = pending.get(id);
      if (entry?.surface !== surface) return 'none';
      return entry.shown ? 'ready' : 'waiting';
    },
    release(id: string, surface: ApplySurface) {
      const entry = pending.get(id);
      if (entry?.surface !== surface || entry.shown) return;
      entry.shown = true;
      changed();
    },
    take(id: string, surface: ApplySurface) {
      const entry = pending.get(id);
      if (entry?.surface !== surface || !entry.shown) return false;
      pending.delete(id);
      return true;
    },
    drop(id: string) {
      if (pending.delete(id)) changed();
    },
    retainCards(ids: Iterable<string>) {
      const kept = new Set(ids);
      let any = false;
      for (const [id, entry] of pending) {
        if (entry.surface === 'card' && !kept.has(id)) {
          pending.delete(id);
          any = true;
        }
      }
      if (any) changed();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    clear() {
      pending.clear();
      changed();
    },
  };
}

export type JustApplied = ReturnType<typeof createJustApplied>;

export const justApplied = createJustApplied();

userCleanups.register(() => justApplied.clear());

import type { Belly, PantryFailure, PantryWrite } from './belly';
import type { AskService } from './consent';

export type PantryState = {
  writing: PantryWrite | null;
  failure: { write: PantryWrite; reason: PantryFailure } | null;
  fed: number;
};

export type StatusSource = {
  getSnapshot(): { userId: string | null };
  applyBelly(userId: string, belly: Belly): void;
  reread(): Promise<unknown>;
};

const EMPTY: PantryState = { writing: null, failure: null, fed: 0 };

export function createPantryStore({
  service,
  status,
}: {
  service: Pick<AskService, 'pantry'>;
  status: StatusSource;
}) {
  let state = EMPTY;
  let epoch = 0;
  const listeners = new Set<() => void>();

  const set = (next: Partial<PantryState>) => {
    state = { ...state, ...next };
    listeners.forEach((listener) => listener());
  };

  async function write(kind: PantryWrite) {
    const userId = status.getSnapshot().userId;
    if (!userId || state.writing) return false;
    const started = epoch;
    set({ writing: kind, failure: null });
    const result = await service.pantry(kind).catch(() => null);
    if (epoch !== started || status.getSnapshot().userId !== userId) return false;
    if (!result || !result.ok || !result.status.belly) {
      const reason = result && !result.ok ? result.failure : 'failed';
      set({ writing: null, failure: { write: kind, reason } });
      void status.reread();
      return false;
    }
    status.applyBelly(userId, result.status.belly);
    set({ writing: null, fed: kind === 'swap' ? state.fed : state.fed + 1 });
    return true;
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => state,
    feed: () => write('feed'),
    swap: () => write('swap'),
    swapAndFeed: () => write('swapFeed'),
    dismissFailure() {
      if (state.failure && !state.writing) set({ failure: null });
    },
    clear() {
      epoch += 1;
      set(EMPTY);
    },
  };
}

export type PantryStore = ReturnType<typeof createPantryStore>;

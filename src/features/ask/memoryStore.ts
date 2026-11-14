import {
  sameLabel,
  type MemoryDraft,
  type MemoryEntry,
  type MemoryFailure,
  type MemoryList,
  type MemoryResult,
  type MemoryService,
} from './memory';

export type MemoryWrite = 'save' | 'remove' | 'clear' | 'switch';

export type MemoryState = {
  userId: string | null;
  status: 'idle' | 'loading' | 'ready' | 'failed' | 'stale';
  data: MemoryList | null;
  writing: MemoryWrite | null;
  removing: string[];
  failure: { write: MemoryWrite; reason: MemoryFailure } | null;
};

const EMPTY: MemoryState = {
  userId: null,
  status: 'idle',
  data: null,
  writing: null,
  removing: [],
  failure: null,
};

function merged(entries: MemoryEntry[], saved: MemoryEntry) {
  const rest = entries.filter(
    (entry) => entry.id !== saved.id && !sameLabel(entry.label, saved.label),
  );
  return [saved, ...rest];
}

export function createMemoryStore(service: MemoryService) {
  let state = EMPTY;
  let epoch = 0;
  const listeners = new Set<() => void>();

  const set = (next: Partial<MemoryState>) => {
    state = { ...state, ...next };
    listeners.forEach((listener) => listener());
  };

  async function load() {
    const { userId } = state;
    if (!userId) return;
    const started = epoch;
    set({ status: state.data ? state.status : 'loading' });
    try {
      const data = await service.list();
      if (epoch === started) set({ status: 'ready', data });
    } catch {
      if (epoch === started) set({ status: state.data ? 'stale' : 'failed' });
    }
  }

  async function write<T>(
    kind: MemoryWrite,
    run: () => Promise<MemoryResult<T>>,
    apply: (value: T, data: MemoryList) => MemoryList,
  ): Promise<MemoryResult<T>> {
    const { userId } = state;
    if (!userId) return { ok: false, failure: 'failed' };
    const started = epoch;
    set({ writing: kind, failure: null });
    const result = await run().catch((): MemoryResult<T> => ({ ok: false, failure: 'failed' }));
    if (epoch !== started) return { ok: false, failure: 'failed' };
    if (!result.ok) {
      set({ writing: null, failure: { write: kind, reason: result.failure } });
      void load();
      return result;
    }
    set({ writing: null, data: state.data ? apply(result.value, state.data) : state.data });
    return result;
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => state,
    attach(userId: string) {
      if (state.userId === userId) return;
      epoch += 1;
      state = { ...EMPTY, userId };
    },
    start(userId: string) {
      if (state.userId !== userId) {
        epoch += 1;
        state = { ...EMPTY, userId };
      }
      return load();
    },
    refresh: load,
    entry(id: string) {
      return state.data?.entries.find((entry) => entry.id === id) ?? null;
    },
    save(draft: MemoryDraft) {
      return write(
        'save',
        () => service.save(draft),
        (saved, data) => ({ ...data, entries: merged(data.entries, saved) }),
      );
    },
    async remove(id: string) {
      if (state.removing.includes(id)) return { ok: false as const, failure: 'failed' as const };
      set({ removing: [...state.removing, id] });
      const result = await write(
        'remove',
        () => service.remove(id),
        (_value, data) => ({ ...data, entries: data.entries.filter((entry) => entry.id !== id) }),
      );
      set({ removing: state.removing.filter((pending) => pending !== id) });
      return result;
    },
    clearAll() {
      return write(
        'clear',
        () => service.clear(),
        (_value, data) => ({ ...data, entries: [] }),
      );
    },
    setEnabled(enabled: boolean) {
      return write(
        'switch',
        () => service.setEnabled(enabled),
        (value, data) => ({ ...data, enabled: value }),
      );
    },
    dismissFailure() {
      if (state.failure && !state.writing) set({ failure: null });
    },
    forget() {
      epoch += 1;
      set(EMPTY);
    },
  };
}

export type MemoryStore = ReturnType<typeof createMemoryStore>;

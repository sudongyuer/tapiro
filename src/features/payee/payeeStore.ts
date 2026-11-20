import type { PayeeDetails, PayeeMethod } from './methods';
import type { PayeeService } from './payeeService';

export type PayeeState =
  | { status: 'idle' }
  | { status: 'loading'; userId: string }
  | {
      status: 'ready';
      userId: string;
      methods: PayeeMethod[];
      loadedAt: number;
      refreshFailed: boolean;
    }
  | { status: 'failed'; userId: string };

export function createPayeeStore(service: PayeeService, now: () => number = Date.now) {
  let state: PayeeState = { status: 'idle' };
  let refreshing: Promise<void> | null = null;
  const listeners = new Set<() => void>();

  function set(next: PayeeState) {
    state = next;
    for (const listener of listeners) listener();
  }

  const isCurrent = (userId: string) => state.status !== 'idle' && state.userId === userId;

  async function reload(userId: string) {
    try {
      const methods = [...(await service.list())];
      if (isCurrent(userId))
        set({ status: 'ready', userId, methods, loadedAt: now(), refreshFailed: false });
    } catch {
      if (!isCurrent(userId)) return;
      if (state.status === 'ready') set({ ...state, refreshFailed: true });
      else set({ status: 'failed', userId });
    }
  }

  async function mutate(userId: string, change: () => Promise<void>) {
    let ok = true;
    try {
      await change();
    } catch {
      ok = false;
    }
    await reload(userId);
    return ok;
  }

  async function ensureLoaded(userId: string) {
    if (isCurrent(userId) && state.status !== 'failed') return;
    set({ status: 'loading', userId });
    await reload(userId);
  }

  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    ensureLoaded,

    async refresh(userId: string) {
      if (!isCurrent(userId) || state.status === 'failed') return ensureLoaded(userId);
      if (state.status !== 'ready') return;
      refreshing ??= reload(userId).finally(() => {
        refreshing = null;
      });
      await refreshing;
    },

    clear() {
      if (state.status !== 'idle') set({ status: 'idle' });
    },

    add: (userId: string, details: PayeeDetails) => mutate(userId, () => service.add(details)),
    update: (userId: string, id: string, details: PayeeDetails) =>
      mutate(userId, () => service.update(id, details)),
    replaceQr: (userId: string, id: string, details: PayeeDetails) =>
      mutate(userId, () => service.replaceQr(id, details)),
    remove: (userId: string, id: string) => mutate(userId, () => service.remove(id)),
    setDefault: (userId: string, id: string) => mutate(userId, () => service.setDefault(id)),
  };
}

export type PayeeStore = ReturnType<typeof createPayeeStore>;

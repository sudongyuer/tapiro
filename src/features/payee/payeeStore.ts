import type { PayeeDetails, PayeeMethod } from './methods';
import type { PayeeService } from './payeeService';

export type PayeeState =
  | { status: 'idle' }
  | { status: 'loading'; userId: string }
  | { status: 'ready'; userId: string; methods: PayeeMethod[] }
  | { status: 'failed'; userId: string };

export function createPayeeStore(service: PayeeService) {
  let state: PayeeState = { status: 'idle' };
  const listeners = new Set<() => void>();

  function set(next: PayeeState) {
    state = next;
    for (const listener of listeners) listener();
  }

  const isCurrent = (userId: string) => state.status !== 'idle' && state.userId === userId;

  async function reload(userId: string) {
    try {
      const methods = [...(await service.list())];
      if (isCurrent(userId)) set({ status: 'ready', userId, methods });
    } catch {
      if (isCurrent(userId) && state.status !== 'ready') set({ status: 'failed', userId });
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

  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    async ensureLoaded(userId: string) {
      if (isCurrent(userId) && state.status !== 'failed') return;
      set({ status: 'loading', userId });
      await reload(userId);
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

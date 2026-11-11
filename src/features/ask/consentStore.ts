import { IDLE_LOAD, loaded, loadFailed, loading, type Loadable } from '@/lib/loadable';

import {
  APP_CONSENT_VERSION,
  cloudAccess,
  type AskService,
  type CloudAccess,
  type ConsentStatus,
  type WriteFailure,
} from './consent';

export type ConsentWrite = 'record' | 'withdraw';

export type ConsentState = {
  userId: string | null;
  status: Loadable<ConsentStatus>;
  writing: ConsentWrite | null;
  failure: { write: ConsentWrite; reason: WriteFailure } | null;
};

export type AskOutcome = 'given' | 'declined';

export type PrepareResult = CloudAccess | 'offline';

const EMPTY: ConsentState = { userId: null, status: IDLE_LOAD, writing: null, failure: null };

export function createConsentStore(service: AskService) {
  let state = EMPTY;
  let epoch = 0;
  let pendingAsk: ((outcome: AskOutcome) => void) | null = null;
  const listeners = new Set<() => void>();

  const set = (next: Partial<ConsentState>) => {
    state = { ...state, ...next };
    listeners.forEach((listener) => listener());
  };

  const settleAsk = (outcome: AskOutcome) => {
    const resolve = pendingAsk;
    pendingAsk = null;
    resolve?.(outcome);
  };

  async function refresh(): Promise<ConsentStatus | null> {
    const userId = state.userId;
    if (!userId) return null;
    const startedAt = epoch;
    set({ status: loading(state.status) });
    try {
      const status = await service.status();
      if (state.userId !== userId || epoch !== startedAt) return currentStatus();
      set({ status: loaded(status) });
      return status;
    } catch {
      if (state.userId !== userId || epoch !== startedAt) return currentStatus();
      set({ status: loadFailed(state.status) });
      return null;
    }
  }

  const currentStatus = () => (state.status.status === 'ready' ? state.status.data : null);

  async function write(kind: ConsentWrite) {
    const userId = state.userId;
    if (!userId || state.writing) return false;
    epoch += 1;
    set({ writing: kind, failure: null });
    const result =
      kind === 'record'
        ? await service.recordConsent(APP_CONSENT_VERSION).catch(() => null)
        : await service.withdrawConsent().catch(() => null);
    if (state.userId !== userId) return false;
    epoch += 1;
    if (!result || !result.ok) {
      set({ writing: null, failure: { write: kind, reason: result?.failure ?? 'failed' } });
      return false;
    }
    set({ writing: null, failure: null, status: loaded(result.status) });
    if (kind === 'record' && result.status.given) settleAsk('given');
    return kind === 'record' ? result.status.given : !result.status.given;
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => state,
    start(userId: string) {
      if (state.userId === userId) return;
      settleAsk('declined');
      epoch += 1;
      state = { ...EMPTY, userId };
      void refresh();
    },
    clear() {
      settleAsk('declined');
      epoch += 1;
      set(EMPTY);
    },
    refresh,
    async prepare(): Promise<PrepareResult> {
      const status = currentStatus() ?? (await refresh());
      return status ? cloudAccess(status) : 'offline';
    },
    record: () => write('record'),
    withdraw: () => write('withdraw'),
    dismissFailure() {
      if (state.failure) set({ failure: null });
    },
    ask(): Promise<AskOutcome> {
      settleAsk('declined');
      if (state.failure?.write === 'record') set({ failure: null });
      return new Promise((resolve) => {
        pendingAsk = resolve;
      });
    },
    decline: () => settleAsk('declined'),
    markRefused() {
      if (state.status.status === 'idle' || !state.status.data) return;
      epoch += 1;
      set({ status: loaded({ ...state.status.data, given: false, acceptedAt: null }) });
      void refresh();
    },
  };
}

export type ConsentStore = ReturnType<typeof createConsentStore>;

export function consentAccess(state: ConsentState): CloudAccess | null {
  return state.status.status === 'idle' || !state.status.data
    ? null
    : cloudAccess(state.status.data);
}

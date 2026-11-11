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

export type AskOutcome = 'given' | 'declined' | 'needsUpdate';

export type PrepareResult = CloudAccess | 'offline';

const EMPTY: ConsentState = { userId: null, status: IDLE_LOAD, writing: null, failure: null };

export function consentAccess(state: ConsentState): CloudAccess | null {
  return state.status.status === 'idle' || !state.status.data
    ? null
    : cloudAccess(state.status.data);
}

export function createConsentStore(service: AskService) {
  let state = EMPTY;
  let epoch = 0;
  let droppedRead = false;
  let pendingAsk: { token: number; resolve: (outcome: AskOutcome) => void } | null = null;
  let asks = 0;
  const listeners = new Set<() => void>();

  const set = (next: Partial<ConsentState>) => {
    state = { ...state, ...next };
    listeners.forEach((listener) => listener());
  };

  const settleAsk = (outcome: AskOutcome, token?: number) => {
    if (!pendingAsk || (token !== undefined && token !== pendingAsk.token)) return;
    const { resolve } = pendingAsk;
    pendingAsk = null;
    resolve(outcome);
  };

  const currentStatus = () => (state.status.status === 'ready' ? state.status.data : null);

  async function refresh(): Promise<ConsentStatus | null> {
    const userId = state.userId;
    if (!userId) return null;
    const startedAt = epoch;
    set({ status: loading(state.status) });
    const status = await service.status().catch(() => null);
    if (state.userId !== userId) return null;
    if (epoch !== startedAt) {
      droppedRead = true;
      return currentStatus();
    }
    set({ status: status ? loaded(status) : loadFailed(state.status) });
    return status;
  }

  const needingUpdate = (): Loadable<ConsentStatus> => {
    const data = state.status.status === 'idle' ? null : state.status.data;
    const known = data ?? { currentVersion: APP_CONSENT_VERSION, given: false, acceptedAt: null };
    return loaded({
      ...known,
      given: false,
      acceptedAt: null,
      currentVersion: Math.max(known.currentVersion, APP_CONSENT_VERSION + 1),
    });
  };

  async function write(kind: ConsentWrite) {
    const userId = state.userId;
    if (!userId || state.writing) return false;
    epoch += 1;
    droppedRead = false;
    set({ writing: kind, failure: null });
    const result =
      kind === 'record'
        ? await service.recordConsent(APP_CONSENT_VERSION).catch(() => null)
        : await service.withdrawConsent().catch(() => null);
    if (state.userId !== userId) return false;
    epoch += 1;
    if (!result || !result.ok) {
      const reason = result?.failure ?? 'failed';
      set({
        writing: null,
        failure: { write: kind, reason },
        ...(reason === 'needsUpdate' ? { status: needingUpdate() } : {}),
      });
      if (droppedRead || state.status.status === 'loading') void refresh();
      return false;
    }
    droppedRead = false;
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
      if (state.failure && !state.writing) set({ failure: null });
    },
    ask(): { token: number; outcome: Promise<AskOutcome> } {
      settleAsk('declined');
      asks += 1;
      const token = asks;
      const outcome = new Promise<AskOutcome>((resolve) => {
        pendingAsk = { token, resolve };
      });
      return { token, outcome };
    },
    pendingAsk: () => pendingAsk?.token ?? null,
    decline(token?: number) {
      settleAsk(consentAccess(state) === 'needsUpdate' ? 'needsUpdate' : 'declined', token);
    },
    markRefused() {
      const status = state.status;
      if (status.status === 'idle' || !status.data) return;
      epoch += 1;
      set({ status: { ...status, data: { ...status.data, given: false, acceptedAt: null } } });
      void refresh();
    },
  };
}

export type ConsentStore = ReturnType<typeof createConsentStore>;

import { createStore } from '@/lib/store';

import {
  createRequests,
  IDLE_LOAD,
  loaded,
  loadFailed,
  loading,
  needsLoad,
  type Loadable,
} from '@/lib/loadable';
import { AccessoryError } from './reputationService';
import type { Accessory, AccessoryFailure, MyMascot, ReputationService, TierDrop } from './types';

export type AccessoryState =
  | { phase: 'idle' }
  | { phase: 'sending'; accessory: Accessory | null }
  | { phase: 'failed'; accessory: Accessory | null; failure: AccessoryFailure };

export type MeState = {
  userId: string | null;
  tierDrop: Loadable<TierDrop | null>;
  dismissedDrop: number | null;
  mascot: Loadable<MyMascot>;
  accessory: AccessoryState;
};

const IDLE: MeState = {
  userId: null,
  tierDrop: IDLE_LOAD,
  dismissedDrop: null,
  mascot: IDLE_LOAD,
  accessory: { phase: 'idle' },
};

const DROP = 'drop';
const MASCOT = 'mascot';

export function createMeStore({ service }: { service: ReputationService }) {
  const store = createStore<MeState>(IDLE);
  const requests = createRequests();
  let generation = 0;

  const get = store.get;
  const patch = (next: Partial<MeState>) => store.set({ ...get(), ...next });
  const current = (userId: string, at: number) => at === generation && get().userId === userId;

  async function reloadTierDrop() {
    const { userId } = get();
    if (!userId) return;
    const at = generation;
    const request = requests.start(DROP);
    patch({ tierDrop: loading(get().tierDrop) });
    try {
      const drop = await service.pendingTierDrop();
      if (!current(userId, at) || !requests.isLatest(DROP, request)) return;
      patch({ tierDrop: loaded(drop) });
    } catch {
      if (!current(userId, at) || !requests.isLatest(DROP, request)) return;
      patch({ tierDrop: loadFailed(get().tierDrop) });
    }
  }

  async function reloadMascot() {
    const { userId } = get();
    if (!userId) return;
    const at = generation;
    const request = requests.start(MASCOT);
    patch({ mascot: loading(get().mascot) });
    try {
      const mascot = await service.myMascot();
      if (!current(userId, at) || !requests.isLatest(MASCOT, request)) return;
      patch({ mascot: loaded(mascot) });
    } catch {
      if (!current(userId, at) || !requests.isLatest(MASCOT, request)) return;
      patch({ mascot: loadFailed(get().mascot) });
    }
  }

  async function writeMascot(userId: string, write: () => Promise<MyMascot>) {
    const at = generation;
    requests.supersede(MASCOT);
    const mascot = await write();
    if (!current(userId, at)) return null;
    requests.supersede(MASCOT);
    patch({ mascot: loaded(mascot) });
    return mascot;
  }

  async function markLevelSeen(level: number) {
    const userId = get().userId;
    if (!userId) return false;
    try {
      return (await writeMascot(userId, () => service.markLevelSeen(level))) !== null;
    } catch {
      return false;
    }
  }

  async function setAccessory(accessory: Accessory | null) {
    const userId = get().userId;
    if (!userId || get().accessory.phase === 'sending') return false;
    const at = generation;
    patch({ accessory: { phase: 'sending', accessory } });
    try {
      const done = await writeMascot(userId, () => service.setAccessory(accessory));
      if (!current(userId, at)) return false;
      patch({ accessory: { phase: 'idle' } });
      return done !== null;
    } catch (error) {
      if (!current(userId, at)) return false;
      const failure = error instanceof AccessoryError ? error.failure : 'failed';
      patch({ accessory: { phase: 'failed', accessory, failure } });
      if (failure === 'locked') void reloadMascot();
      return false;
    }
  }

  async function dismissTierDrop(id: number) {
    const userId = get().userId;
    if (!userId) return false;
    patch({ dismissedDrop: Math.max(get().dismissedDrop ?? 0, id) });
    const at = generation;
    try {
      await service.markTierDropSeen(id);
      return current(userId, at);
    } catch {
      return false;
    }
  }

  function refresh() {
    const { userId, tierDrop, mascot } = get();
    if (!userId) return;
    if (tierDrop.status !== 'idle') void reloadTierDrop();
    if (mascot.status !== 'idle') void reloadMascot();
  }

  function clear() {
    generation += 1;
    requests.clear();
    store.set(IDLE);
  }

  return {
    getSnapshot: get,
    subscribe: store.subscribe,
    start(userId: string) {
      if (get().userId === userId) return;
      clear();
      patch({ userId });
    },
    clear,
    loadTierDrop() {
      if (needsLoad(get().tierDrop)) void reloadTierDrop();
    },
    loadMascot() {
      if (needsLoad(get().mascot)) void reloadMascot();
    },
    reloadTierDrop,
    reloadMascot,
    markLevelSeen,
    setAccessory,
    dismissTierDrop,
    refresh,
    onStickers() {
      if (get().userId && get().mascot.status !== 'idle') void reloadMascot();
    },
  };
}

export const shownTierDrop = (state: MeState): TierDrop | null => {
  const { tierDrop, dismissedDrop } = state;
  if (tierDrop.status !== 'ready' || !tierDrop.data) return null;
  return dismissedDrop !== null && tierDrop.data.id <= dismissedDrop ? null : tierDrop.data;
};

export type MeStore = ReturnType<typeof createMeStore>;

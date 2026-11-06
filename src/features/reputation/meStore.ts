import { createStore } from '@/lib/store';

import {
  createRequests,
  IDLE_LOAD,
  loaded,
  needsLoad,
  readInto,
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
const WRITE = 'mascotWrite';

export function createMeStore({ service }: { service: ReputationService }) {
  const store = createStore<MeState>(IDLE);
  const requests = createRequests();
  let generation = 0;

  const get = store.get;
  const patch = (next: Partial<MeState>) => store.set({ ...get(), ...next });
  const current = (userId: string, at: number) => at === generation && get().userId === userId;

  function reloadTierDrop() {
    const { userId } = get();
    if (!userId) return Promise.resolve();
    const at = generation;
    return readInto({
      requests,
      key: DROP,
      read: () => service.pendingTierDrop(),
      current: () => current(userId, at),
      value: () => get().tierDrop,
      set: (tierDrop) => patch({ tierDrop }),
    });
  }

  function reloadMascot() {
    const { userId } = get();
    if (!userId) return Promise.resolve();
    const at = generation;
    return readInto({
      requests,
      key: MASCOT,
      read: () => service.myMascot(),
      current: () => current(userId, at),
      value: () => get().mascot,
      set: (mascot) => patch({ mascot }),
    });
  }

  async function writeMascot(userId: string, write: () => Promise<MyMascot>) {
    const at = generation;
    const request = requests.start(WRITE);
    try {
      const mascot = await write();
      if (current(userId, at) && requests.isLatest(WRITE, request)) {
        const dropped = requests.supersede(MASCOT);
        patch({ mascot: loaded(mascot) });
        if (dropped) void reloadMascot();
      }
      return true;
    } catch (error) {
      if (current(userId, at) && requests.isLatest(WRITE, request)) void reloadMascot();
      throw error;
    } finally {
      requests.end(WRITE, request);
    }
  }

  async function markLevelSeen(level: number) {
    const userId = get().userId;
    if (!userId) return false;
    try {
      return await writeMascot(userId, () => service.markLevelSeen(level));
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
      return done;
    } catch (error) {
      if (!current(userId, at)) return false;
      const failure = error instanceof AccessoryError ? error.failure : 'failed';
      patch({ accessory: { phase: 'failed', accessory, failure } });
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

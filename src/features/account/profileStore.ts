import type { Profile, ProfileService } from './profileService';
import type { AccountUser } from './types';

export type ProfileState =
  | { status: 'idle' }
  | { status: 'loading'; userId: string }
  | { status: 'ready'; userId: string; profile: Profile | null }
  | { status: 'failed'; userId: string };

export function createProfileStore(service: ProfileService) {
  let state: ProfileState = { status: 'idle' };
  const listeners = new Set<() => void>();

  function set(next: ProfileState) {
    state = next;
    for (const listener of listeners) listener();
  }

  const isCurrent = (userId: string) => state.status !== 'idle' && state.userId === userId;

  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    async ensureLoaded(user: AccountUser) {
      if (isCurrent(user.id) && state.status !== 'failed') return;
      set({ status: 'loading', userId: user.id });
      try {
        const profile = await service.load(user);
        if (isCurrent(user.id)) set({ status: 'ready', userId: user.id, profile });
      } catch {
        if (isCurrent(user.id)) set({ status: 'failed', userId: user.id });
      }
    },

    async save(user: AccountUser, profile: Profile) {
      const saved = await service.save(user, profile).catch(() => false);
      if (saved) set({ status: 'ready', userId: user.id, profile });
      return saved;
    },

    forget(userId: string) {
      service.forget(userId);
      if (isCurrent(userId)) set({ status: 'idle' });
    },
  };
}

export type ProfileStore = ReturnType<typeof createProfileStore>;

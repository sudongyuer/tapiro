import { createSessionStore } from './sessionStore';
import type { AccountUser, AuthProvider, AuthService } from './types';

export function fixtureUser(provider: AuthProvider): AccountUser {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    email: provider === 'apple' ? 'fixture@privaterelay.appleid.com' : 'fixture@gmail.com',
    name: '林小貘',
    avatarUrl: null,
    provider,
  };
}

export function createFixtureAuthService(): AuthService {
  const store = createSessionStore({ status: 'signedOut' });
  return {
    getState: store.get,
    subscribe: store.subscribe,
    isProviderConfigured: () => true,
    async signIn(provider) {
      store.set({ status: 'signedIn', user: fixtureUser(provider) });
      return { ok: true };
    },
    async signOut() {
      store.set({ status: 'signedOut' });
    },
    async deleteAccount() {
      if (store.get().status !== 'signedIn') return { ok: false, reason: 'signedOut' };
      store.set({ status: 'signedOut' });
      return { ok: true };
    },
  };
}

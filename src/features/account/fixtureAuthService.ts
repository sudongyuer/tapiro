import { createSessionStore } from './sessionStore';
import type { AccountUser, AuthProvider, AuthService, UnsettledPayment } from './types';

export function fixtureUser(provider: AuthProvider): AccountUser {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    email: provider === 'apple' ? 'fixture@privaterelay.appleid.com' : 'fixture@gmail.com',
    name: '林小貘',
    avatarUrl: null,
    provider,
  };
}

export const fixtureUnsettledPayment: UnsettledPayment = {
  id: '00000000-0000-4000-8000-0000000000a1',
  title: '帮忙从 Mid Valley 带一份奶茶',
  counterpartName: '陈嘉欣',
  amountSen: 1250,
  direction: 'owe',
};

export type FixtureAuthOptions = {
  signedInAs?: AuthProvider;
  deletion?: 'allowed' | 'blocked';
};

export function createFixtureAuthService({
  signedInAs,
  deletion = 'allowed',
}: FixtureAuthOptions = {}): AuthService {
  const store = createSessionStore(
    signedInAs ? { status: 'signedIn', user: fixtureUser(signedInAs) } : { status: 'signedOut' },
  );
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
      if (deletion === 'blocked') {
        return { ok: false, reason: 'blocked', payments: [fixtureUnsettledPayment] };
      }
      store.set({ status: 'signedOut' });
      return { ok: true };
    },
  };
}

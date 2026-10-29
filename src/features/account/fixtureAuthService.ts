import type { FixtureVariant } from '@/lib/fixtureVariant';

import { createSessionStore } from './sessionStore';
import type { AccountUser, AuthProvider, AuthService, UnsettledPayment } from './types';

const FIXTURE_USER_NAMES: Record<FixtureVariant, string> = {
  demo: '林小貘',
  worst: 'Muhammad Hafiz Haikal bin Mohd Yusof Ali',
  one: 'Jo',
  empty: '林小貘',
};

export function fixtureUser(provider: AuthProvider, variant: FixtureVariant = 'demo'): AccountUser {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    email: provider === 'apple' ? 'fixture@privaterelay.appleid.com' : 'fixture@gmail.com',
    name: FIXTURE_USER_NAMES[variant],
    avatarUrl: null,
    provider,
  };
}

export const fixtureUnsettledPayment: UnsettledPayment = {
  id: '00000000-0000-4000-8000-0000000000a1',
  title: '帮忙从 Mid Valley 带一份奶茶',
  counterpartName: '陈嘉欣',
  amount: { minor: 1250, currency: 'MYR' },
  direction: 'owe',
};

export type FixtureAuthOptions = {
  signedInAs?: AuthProvider;
  deletion?: 'allowed' | 'blocked';
  variant?: FixtureVariant;
};

export function createFixtureAuthService({
  signedInAs,
  deletion = 'allowed',
  variant = 'demo',
}: FixtureAuthOptions = {}): AuthService {
  const store = createSessionStore(
    signedInAs
      ? { status: 'signedIn', user: fixtureUser(signedInAs, variant) }
      : { status: 'signedOut' },
  );
  return {
    getState: store.get,
    subscribe: store.subscribe,
    async signIn(provider) {
      store.set({ status: 'signedIn', user: fixtureUser(provider, variant) });
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

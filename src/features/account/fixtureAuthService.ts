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

const MANY_UNSETTLED: Pick<UnsettledPayment, 'title' | 'counterpartName' | 'direction'>[] = [
  { title: '帮忙从 Mid Valley 带一份奶茶', counterpartName: '陈嘉欣', direction: 'owe' },
  { title: '代取 Shopee 包裹送到 Block C 楼下', counterpartName: 'Aiman', direction: 'owed' },
  { title: '周五拼车去 KLIA2', counterpartName: '欧阳娜娜', direction: 'owe' },
  { title: '打印 40 页讲义并装订', counterpartName: 'Nur Aisyah', direction: 'owed' },
  { title: '排队买演唱会门票', counterpartName: '阿杰', direction: 'owe' },
  { title: '周日拼车回 Sunway', counterpartName: '林美玲', direction: 'owe' },
];

export const fixtureUnsettledPayments: UnsettledPayment[] = MANY_UNSETTLED.map(
  (payment, index) => ({
    ...payment,
    id: `00000000-0000-4000-8000-0000000000a${index + 1}`,
    amount: { minor: 1250 + index * 475, currency: 'MYR' },
  }),
);

export type FixtureDeletion = 'allowed' | 'blocked' | 'blockedMany';

export const fixtureDeletion = (value: string | undefined): FixtureDeletion =>
  value === 'blocked' || value === 'blockedMany' ? value : 'allowed';

export type FixtureAuthOptions = {
  signedInAs?: AuthProvider;
  deletion?: FixtureDeletion;
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
    isAvailable: () => true,
    async signIn(provider) {
      store.set({ status: 'signedIn', user: fixtureUser(provider, variant) });
      return { ok: true };
    },
    async signOut() {
      store.set({ status: 'signedOut' });
    },
    async deleteAccount() {
      if (store.get().status !== 'signedIn') return { ok: false, reason: 'signedOut' };
      if (deletion !== 'allowed') {
        const payments =
          deletion === 'blocked' ? [fixtureUnsettledPayment] : fixtureUnsettledPayments;
        return { ok: false, reason: 'blocked', payments };
      }
      store.set({ status: 'signedOut' });
      return { ok: true };
    },
  };
}

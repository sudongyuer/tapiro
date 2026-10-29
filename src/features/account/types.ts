import type { Money } from '@/lib/money';

export type AuthProvider = 'apple' | 'google';

export const AUTH_PROVIDERS: readonly AuthProvider[] = ['apple', 'google'];

export type AccountUser = {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  provider: AuthProvider | null;
};

export type SessionState =
  { status: 'loading' } | { status: 'signedOut' } | { status: 'signedIn'; user: AccountUser };

export type SignInFailure = 'notConfigured' | 'cancelled' | 'failed' | 'network';

export type SignInResult = { ok: true } | { ok: false; reason: SignInFailure };

export type DeleteAccountFailure = 'signedOut' | 'blocked' | 'failed' | 'network';

export type UnsettledPayment = {
  id: string;
  title: string;
  counterpartName: string;
  amount: Money;
  direction: 'owe' | 'owed';
};

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; reason: 'blocked'; payments: UnsettledPayment[] }
  | { ok: false; reason: Exclude<DeleteAccountFailure, 'blocked'> };

export type IdTokenResult =
  | { ok: true; idToken: string; nonce?: string; accessToken?: string; fullName?: string }
  | { ok: false; reason: 'cancelled' | 'failed' };

export type IdTokenProvider = {
  requestIdToken(): Promise<IdTokenResult>;
};

export type ProviderAdapters = Partial<Record<AuthProvider, IdTokenProvider>>;

export type AuthService = {
  getState(): SessionState;
  subscribe(listener: () => void): () => void;
  signIn(provider: AuthProvider): Promise<SignInResult>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<DeleteAccountResult>;
};

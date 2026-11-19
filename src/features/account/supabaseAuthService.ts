import {
  FunctionsFetchError,
  FunctionsHttpError,
  isAuthRetryableFetchError,
  type SupabaseClient,
} from '@supabase/supabase-js';

import { createSessionStore } from './sessionStore';
import { toAccountUser } from './toAccountUser';
import { readUnsettledPayments } from './unsettledPayments';
import type {
  AuthProvider,
  AuthService,
  IdTokenResult,
  ProviderAdapters,
  SignInResult,
} from './types';

export const ACCOUNT_DELETE_FUNCTION = 'account-delete';
export const ACCOUNT_DELETE_BLOCKED_STATUS = 409;

export function createSupabaseAuthService(
  client: SupabaseClient | null,
  adapters: ProviderAdapters,
): AuthService {
  const store = createSessionStore(client ? { status: 'loading' } : { status: 'signedOut' });
  const forgetProviders = () =>
    Promise.all(Object.values(adapters).map((adapter) => adapter.forget?.().catch(() => {})));
  // Apple sends the name only on the first authorisation. Keep it across failed attempts and sign-outs, but write it
  // only to the same provider account, so one person's name cannot land on another account.
  let pendingName: { provider: AuthProvider; subject: string; fullName: string } | null = null;

  client?.auth.onAuthStateChange((_event, session) => {
    store.set(
      session ? { status: 'signedIn', user: toAccountUser(session.user) } : { status: 'signedOut' },
    );
  });

  return {
    getState: store.get,
    isAvailable: (provider) => Boolean(adapters[provider]),
    subscribe: store.subscribe,

    async signIn(provider) {
      const adapter = adapters[provider];
      if (!client || !adapter) return { ok: false, reason: 'notConfigured' };
      try {
        const token = await adapter.requestIdToken();
        if (!token.ok) return { ok: false, reason: token.reason };
        const subject = token.account?.subject;
        const fullName = token.account?.fullName?.trim();
        if (subject && fullName) pendingName = { provider, subject, fullName };
        const result = await exchangeIdToken(client, provider, token);
        if (!result.ok) return result;
        const name = pendingName;
        pendingName = null;
        if (name && name.provider === provider && name.subject === subject) {
          if (!(await saveFullName(client, name.fullName))) pendingName = name;
        }
        return result;
      } catch {
        return { ok: false, reason: 'failed' };
      }
    },

    async signInWithPassword(email, password) {
      if (!client) return { ok: false, reason: 'notConfigured' };
      try {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (!error) return { ok: true };
        return { ok: false, reason: isAuthRetryableFetchError(error) ? 'network' : 'failed' };
      } catch {
        return { ok: false, reason: 'failed' };
      }
    },

    async signOut() {
      await client?.auth.signOut({ scope: 'local' }).catch(() => {});
      await forgetProviders();
    },

    async deleteAccount() {
      if (!client || store.get().status !== 'signedIn') return { ok: false, reason: 'signedOut' };
      const { error } = await client.functions.invoke(ACCOUNT_DELETE_FUNCTION, { method: 'POST' });
      if (error instanceof FunctionsHttpError) {
        if (error.context?.status !== ACCOUNT_DELETE_BLOCKED_STATUS) {
          return { ok: false, reason: 'failed' };
        }
        return {
          ok: false,
          reason: 'blocked',
          payments: await readUnsettledPayments(error.context),
        };
      }
      if (error instanceof FunctionsFetchError) return { ok: false, reason: 'network' };
      if (error) return { ok: false, reason: 'failed' };
      pendingName = null;
      await client.auth.signOut({ scope: 'local' });
      await forgetProviders();
      return { ok: true };
    },
  };
}

async function exchangeIdToken(
  client: SupabaseClient,
  provider: AuthProvider,
  token: Extract<IdTokenResult, { ok: true }>,
): Promise<SignInResult> {
  const { error } = await client.auth.signInWithIdToken({
    provider,
    token: token.idToken,
    nonce: token.nonce,
    access_token: token.accessToken,
  });
  if (error) return { ok: false, reason: isAuthRetryableFetchError(error) ? 'network' : 'failed' };
  return { ok: true };
}

async function saveFullName(client: SupabaseClient, fullName: string): Promise<boolean> {
  try {
    const { error } = await client.auth.updateUser({ data: { full_name: fullName } });
    return !error;
  } catch {
    return false;
  }
}

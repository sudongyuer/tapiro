import {
  FunctionsFetchError,
  FunctionsHttpError,
  isAuthRetryableFetchError,
  type SupabaseClient,
} from '@supabase/supabase-js';

import { createSessionStore } from './sessionStore';
import { toAccountUser } from './toAccountUser';
import type { AuthService, ProviderAdapters } from './types';

export const ACCOUNT_DELETE_FUNCTION = 'account-delete';
export const ACCOUNT_DELETE_BLOCKED_STATUS = 409;

export function createSupabaseAuthService(
  client: SupabaseClient | null,
  adapters: ProviderAdapters,
): AuthService {
  const store = createSessionStore(client ? { status: 'loading' } : { status: 'signedOut' });

  client?.auth.onAuthStateChange((_event, session) => {
    store.set(
      session ? { status: 'signedIn', user: toAccountUser(session.user) } : { status: 'signedOut' },
    );
  });

  return {
    getState: store.get,
    subscribe: store.subscribe,
    isProviderConfigured: (provider) => Boolean(client && adapters[provider]),

    async signIn(provider) {
      const adapter = adapters[provider];
      if (!client || !adapter) return { ok: false, reason: 'notConfigured' };
      const token = await adapter.requestIdToken();
      if (!token.ok) return { ok: false, reason: token.reason };
      const { error } = await client.auth.signInWithIdToken({
        provider,
        token: token.idToken,
        nonce: token.nonce,
        access_token: token.accessToken,
      });
      if (!error) return { ok: true };
      return { ok: false, reason: isAuthRetryableFetchError(error) ? 'network' : 'failed' };
    },

    async signOut() {
      await client?.auth.signOut();
    },

    async deleteAccount() {
      if (!client || store.get().status !== 'signedIn') return { ok: false, reason: 'signedOut' };
      const { error } = await client.functions.invoke(ACCOUNT_DELETE_FUNCTION, { method: 'POST' });
      if (error instanceof FunctionsHttpError) {
        const blocked = error.context?.status === ACCOUNT_DELETE_BLOCKED_STATUS;
        return { ok: false, reason: blocked ? 'blocked' : 'failed' };
      }
      if (error instanceof FunctionsFetchError) return { ok: false, reason: 'network' };
      if (error) return { ok: false, reason: 'failed' };
      await client.auth.signOut({ scope: 'local' });
      return { ok: true };
    },
  };
}

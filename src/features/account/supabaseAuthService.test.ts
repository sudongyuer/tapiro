import { describe, expect, mock, test } from 'bun:test';
import {
  AuthApiError,
  AuthRetryableFetchError,
  FunctionsFetchError,
  FunctionsHttpError,
  type Session,
  type SupabaseClient,
} from '@supabase/supabase-js';

import { createSupabaseAuthService } from './supabaseAuthService';
import type { IdTokenProvider } from './types';

type Listener = (event: string, session: Session | null) => void;

function fakeClient({ signInError = null as unknown, invokeError = null as unknown } = {}) {
  let listener: Listener = () => {};
  const signInWithIdToken = mock(async () => ({ error: signInError }));
  const signOut = mock(async () => ({ error: null }));
  const invoke = mock(async () => ({ data: null, error: invokeError }));
  const client = {
    auth: {
      onAuthStateChange: (callback: Listener) => {
        listener = callback;
        return { data: { subscription: { unsubscribe() {} } } };
      },
      signInWithIdToken,
      signOut,
    },
    functions: { invoke },
  } as unknown as SupabaseClient;
  const emit = (session: Session | null) => listener('SIGNED_IN', session);
  return { client, emit, signInWithIdToken, signOut, invoke };
}

const session = {
  user: {
    id: 'u1',
    email: 'a@b.c',
    user_metadata: { full_name: '林小貘', picture: 'https://example.com/a.png' },
    app_metadata: { provider: 'google' },
  },
} as unknown as Session;

const apple: IdTokenProvider = {
  requestIdToken: async () => ({ ok: true, idToken: 'token', nonce: 'nonce' }),
};

describe('supabase auth service', () => {
  test('without a client it is signed out and every provider is unconfigured', async () => {
    const service = createSupabaseAuthService(null, { apple });
    expect(service.getState()).toEqual({ status: 'signedOut' });
    expect(service.isProviderConfigured('apple')).toBe(false);
    expect(await service.signIn('apple')).toEqual({ ok: false, reason: 'notConfigured' });
  });

  test('a provider without an adapter is not configured', async () => {
    const { client, signInWithIdToken } = fakeClient();
    const service = createSupabaseAuthService(client, { apple });
    expect(service.isProviderConfigured('google')).toBe(false);
    expect(await service.signIn('google')).toEqual({ ok: false, reason: 'notConfigured' });
    expect(signInWithIdToken).not.toHaveBeenCalled();
  });

  test('passes the provider ID token and nonce to Supabase', async () => {
    const { client, signInWithIdToken } = fakeClient();
    const service = createSupabaseAuthService(client, { apple });
    expect(await service.signIn('apple')).toEqual({ ok: true });
    expect(signInWithIdToken).toHaveBeenCalledWith({
      provider: 'apple',
      token: 'token',
      nonce: 'nonce',
      access_token: undefined,
    });
  });

  test('a cancelled provider sheet stores nothing', async () => {
    const { client, signInWithIdToken } = fakeClient();
    const cancelled: IdTokenProvider = {
      requestIdToken: async () => ({ ok: false, reason: 'cancelled' }),
    };
    const service = createSupabaseAuthService(client, { apple: cancelled });
    expect(await service.signIn('apple')).toEqual({ ok: false, reason: 'cancelled' });
    expect(signInWithIdToken).not.toHaveBeenCalled();
  });

  test('maps rejected and unreachable sign-in', async () => {
    const rejected = fakeClient({ signInError: new AuthApiError('bad token', 400, undefined) });
    expect(await createSupabaseAuthService(rejected.client, { apple }).signIn('apple')).toEqual({
      ok: false,
      reason: 'failed',
    });
    const offline = fakeClient({ signInError: new AuthRetryableFetchError('offline', 0) });
    expect(await createSupabaseAuthService(offline.client, { apple }).signIn('apple')).toEqual({
      ok: false,
      reason: 'network',
    });
  });

  test('follows auth state changes', () => {
    const { client, emit } = fakeClient();
    const service = createSupabaseAuthService(client, {});
    expect(service.getState()).toEqual({ status: 'loading' });
    emit(session);
    expect(service.getState()).toEqual({
      status: 'signedIn',
      user: {
        id: 'u1',
        email: 'a@b.c',
        name: '林小貘',
        avatarUrl: 'https://example.com/a.png',
        provider: 'google',
      },
    });
    emit(null);
    expect(service.getState()).toEqual({ status: 'signedOut' });
  });

  test('deletes the account through the Edge Function, then clears the local session', async () => {
    const { client, emit, invoke, signOut } = fakeClient();
    const service = createSupabaseAuthService(client, {});
    emit(session);
    expect(await service.deleteAccount()).toEqual({ ok: true });
    expect(invoke).toHaveBeenCalledWith('account-delete', { method: 'POST' });
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  test('maps deletion failures and keeps the session', async () => {
    const cases = [
      [new FunctionsHttpError(new Response(null, { status: 409 })), 'blocked'],
      [new FunctionsHttpError(new Response(null, { status: 500 })), 'failed'],
      [new FunctionsFetchError(new Error('offline')), 'network'],
    ] as const;
    for (const [invokeError, reason] of cases) {
      const { client, emit, signOut } = fakeClient({ invokeError });
      const service = createSupabaseAuthService(client, {});
      emit(session);
      expect(await service.deleteAccount()).toEqual({ ok: false, reason });
      expect(signOut).not.toHaveBeenCalled();
    }
  });

  test('deleting while signed out does not call the function', async () => {
    const { client, emit, invoke } = fakeClient();
    const service = createSupabaseAuthService(client, {});
    emit(null);
    expect(await service.deleteAccount()).toEqual({ ok: false, reason: 'signedOut' });
    expect(invoke).not.toHaveBeenCalled();
  });
});

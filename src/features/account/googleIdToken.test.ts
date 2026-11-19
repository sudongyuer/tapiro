import { describe, expect, test } from 'bun:test';

import {
  createGoogleIdTokenProvider,
  type GoogleClientIds,
  type GoogleSignInModule,
  type GoogleSignInResponse,
  readGoogleClientIds,
} from './googleIdToken';

const ids: GoogleClientIds = {
  iosClientId: '123-ios.apps.googleusercontent.com',
  webClientId: '123-web.apps.googleusercontent.com',
};

const IOS_CANCELLED = '-5';

function fakeGoogle(signIn: () => Promise<GoogleSignInResponse>) {
  const configured: GoogleClientIds[] = [];
  let signedOut = 0;
  const google: GoogleSignInModule = {
    configure: (options) => {
      configured.push(options);
    },
    signIn,
    signOut: async () => {
      signedOut += 1;
    },
    cancelledCode: IOS_CANCELLED,
  };
  return { google, configured, signedOuts: () => signedOut };
}

const rejecting = (code: string) => async (): Promise<GoogleSignInResponse> => {
  throw Object.assign(new Error(code), { code });
};

describe('google ID token provider', () => {
  test('configures both client IDs once and returns the ID token', async () => {
    const { google, configured } = fakeGoogle(async () => ({
      type: 'success',
      data: { idToken: 'google-jwt' },
    }));
    const provider = createGoogleIdTokenProvider(google, ids);
    expect(await provider.requestIdToken()).toEqual({ ok: true, idToken: 'google-jwt' });
    await provider.requestIdToken();
    expect(configured).toEqual([ids]);
  });

  test('a cancelled response and the native cancel code are cancelled', async () => {
    for (const signIn of [
      async (): Promise<GoogleSignInResponse> => ({ type: 'cancelled', data: null }),
      rejecting(IOS_CANCELLED),
    ]) {
      const provider = createGoogleIdTokenProvider(fakeGoogle(signIn).google, ids);
      expect(await provider.requestIdToken()).toEqual({ ok: false, reason: 'cancelled' });
    }
  });

  test('a missing ID token or another error fails', async () => {
    for (const signIn of [
      async (): Promise<GoogleSignInResponse> => ({ type: 'success', data: { idToken: null } }),
      rejecting('ASYNC_OP_IN_PROGRESS'),
      rejecting('SIGN_IN_CANCELLED'),
    ]) {
      const provider = createGoogleIdTokenProvider(fakeGoogle(signIn).google, ids);
      expect(await provider.requestIdToken()).toEqual({ ok: false, reason: 'failed' });
    }
  });

  test('a configure failure fails and is retried on the next attempt', async () => {
    let calls = 0;
    const google: GoogleSignInModule = {
      ...fakeGoogle(async () => ({ type: 'success', data: { idToken: 'google-jwt' } })).google,
      configure: () => {
        calls += 1;
        if (calls === 1) throw new Error('bad config');
      },
    };
    const provider = createGoogleIdTokenProvider(google, ids);
    expect(await provider.requestIdToken()).toEqual({ ok: false, reason: 'failed' });
    expect(await provider.requestIdToken()).toEqual({ ok: true, idToken: 'google-jwt' });
  });
});

test('forget signs out of Google even before this launch configured it, and never throws', async () => {
  const { google, signedOuts } = fakeGoogle(async () => ({ type: 'cancelled', data: null }));
  await createGoogleIdTokenProvider(google, ids).forget?.();
  expect(signedOuts()).toBe(1);
  const failing = { ...google, signOut: async () => Promise.reject(new Error('keychain')) };
  await createGoogleIdTokenProvider(failing, ids).forget?.();
});

describe('google client IDs', () => {
  test('both public client IDs are required', () => {
    expect(readGoogleClientIds(ids.iosClientId, ids.webClientId)).toEqual(ids);
    expect(readGoogleClientIds(` ${ids.iosClientId} `, ids.webClientId)).toEqual(ids);
    expect(readGoogleClientIds(undefined, ids.webClientId)).toBeNull();
    expect(readGoogleClientIds(ids.iosClientId, '')).toBeNull();
  });

  test('a value that is not a Google client ID leaves Google unconfigured', () => {
    expect(readGoogleClientIds('com.googleusercontent.apps.123-ios', ids.webClientId)).toBeNull();
    expect(readGoogleClientIds(ids.iosClientId, 'GOCSPX-secret')).toBeNull();
  });
});

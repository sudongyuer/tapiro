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

function fakeGoogle(signIn: () => Promise<GoogleSignInResponse>) {
  const configured: GoogleClientIds[] = [];
  const google: GoogleSignInModule = {
    configure: (options) => {
      configured.push(options);
    },
    signIn,
  };
  return { google, configured };
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

  test('a cancelled response and a cancel rejection are cancelled', async () => {
    for (const signIn of [
      async (): Promise<GoogleSignInResponse> => ({ type: 'cancelled', data: null }),
      rejecting('SIGN_IN_CANCELLED'),
    ]) {
      const provider = createGoogleIdTokenProvider(fakeGoogle(signIn).google, ids);
      expect(await provider.requestIdToken()).toEqual({ ok: false, reason: 'cancelled' });
    }
  });

  test('a missing ID token or another error fails', async () => {
    for (const signIn of [
      async (): Promise<GoogleSignInResponse> => ({ type: 'success', data: { idToken: null } }),
      rejecting('IN_PROGRESS'),
      rejecting('-5'),
    ]) {
      const provider = createGoogleIdTokenProvider(fakeGoogle(signIn).google, ids);
      expect(await provider.requestIdToken()).toEqual({ ok: false, reason: 'failed' });
    }
  });

  test('a configure failure fails and is retried on the next attempt', async () => {
    let calls = 0;
    const google: GoogleSignInModule = {
      configure: () => {
        calls += 1;
        if (calls === 1) throw new Error('bad config');
      },
      signIn: async () => ({ type: 'success', data: { idToken: 'google-jwt' } }),
    };
    const provider = createGoogleIdTokenProvider(google, ids);
    expect(await provider.requestIdToken()).toEqual({ ok: false, reason: 'failed' });
    expect(await provider.requestIdToken()).toEqual({ ok: true, idToken: 'google-jwt' });
  });
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

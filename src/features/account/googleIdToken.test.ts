import { describe, expect, test } from 'bun:test';

import {
  createGoogleIdTokenProvider,
  type GoogleClientIds,
  type GoogleSignInModule,
  type GoogleSignInResponse,
  googleUrlScheme,
  readGoogleClientIds,
} from './googleIdToken';
import { googleUrlScheme as pluginUrlScheme } from '../../../plugins/withGoogleSignIn.js';

const ids: GoogleClientIds = {
  iosClientId: '123-ios.apps.googleusercontent.com',
  webClientId: '123-web.apps.googleusercontent.com',
};

function fakeGoogle(signIn: () => Promise<GoogleSignInResponse>) {
  const configured: GoogleClientIds[] = [];
  let signedOut = 0;
  const calls: string[] = [];
  const google: GoogleSignInModule = {
    configure: (options) => {
      configured.push(options);
    },
    signIn,
    signOut: async () => {
      signedOut += 1;
      calls.push('signOut');
    },
    signInSilently: async () => {
      calls.push('signInSilently');
    },
    revokeAccess: async () => {
      calls.push('revokeAccess');
    },
  };
  return { google, configured, signedOuts: () => signedOut, calls };
}

const rejecting = (code: string) => async (): Promise<GoogleSignInResponse> => {
  throw Object.assign(new Error(code), { code });
};

describe('google ID token provider', () => {
  test('configures both client IDs before every attempt and returns the ID token', async () => {
    const { google, configured } = fakeGoogle(async () => ({
      type: 'success',
      data: { idToken: 'google-jwt' },
    }));
    const provider = createGoogleIdTokenProvider(google, ids);
    expect(await provider.requestIdToken()).toEqual({ ok: true, idToken: 'google-jwt' });
    await provider.requestIdToken();
    expect(configured).toEqual([ids, ids]);
  });

  test('a cancelled response is cancelled', async () => {
    const cancelled = async (): Promise<GoogleSignInResponse> => ({
      type: 'cancelled',
      data: null,
    });
    const provider = createGoogleIdTokenProvider(fakeGoogle(cancelled).google, ids);
    expect(await provider.requestIdToken()).toEqual({ ok: false, reason: 'cancelled' });
  });

  test('a missing ID token or another error fails', async () => {
    for (const signIn of [
      async (): Promise<GoogleSignInResponse> => ({ type: 'success', data: { idToken: null } }),
      rejecting('ASYNC_OP_IN_PROGRESS'),
      rejecting('SIGN_IN_ERROR'),
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

test('forget signs out of Google, restores and revokes access only after deletion, and never throws', async () => {
  const signOut = fakeGoogle(async () => ({ type: 'cancelled', data: null }));
  await createGoogleIdTokenProvider(signOut.google, ids).forget?.('signOut');
  expect(signOut.calls).toEqual(['signOut']);
  const deleted = fakeGoogle(async () => ({ type: 'cancelled', data: null }));
  await createGoogleIdTokenProvider(deleted.google, ids).forget?.('deleted');
  expect(deleted.calls).toEqual(['signInSilently', 'revokeAccess', 'signOut']);
  expect(deleted.configured).toEqual([ids]);
  const failing = {
    ...deleted.google,
    signInSilently: async () => Promise.reject(new Error('no previous sign-in')),
    revokeAccess: async () => Promise.reject(new Error('no session')),
    signOut: async () => Promise.reject(new Error('keychain')),
  };
  await createGoogleIdTokenProvider(failing, ids).forget?.('deleted');
});

const schemes = ['tapiro', 'app.tapiro', 'com.googleusercontent.apps.123-ios'];

describe('google client IDs', () => {
  test('both public client IDs are required', () => {
    expect(readGoogleClientIds(ids.iosClientId, ids.webClientId, schemes)).toEqual(ids);
    expect(readGoogleClientIds(` ${ids.iosClientId} `, ids.webClientId, schemes)).toEqual(ids);
    expect(readGoogleClientIds(undefined, ids.webClientId, schemes)).toBeNull();
    expect(readGoogleClientIds(ids.iosClientId, '', schemes)).toBeNull();
  });

  test('a value that is not a Google client ID leaves Google unconfigured', () => {
    expect(
      readGoogleClientIds('com.googleusercontent.apps.123-ios', ids.webClientId, schemes),
    ).toBeNull();
    expect(readGoogleClientIds(ids.iosClientId, 'GOCSPX-secret', schemes)).toBeNull();
  });

  test('without the reversed client ID registered as a URL scheme, Google stays off', () => {
    expect(googleUrlScheme(ids.iosClientId)).toBe('com.googleusercontent.apps.123-ios');
    expect(readGoogleClientIds(ids.iosClientId, ids.webClientId, ['tapiro'])).toBeNull();
    expect(
      readGoogleClientIds(ids.iosClientId, ids.webClientId, ['com.googleusercontent.apps.999-old']),
    ).toBeNull();
  });
});

test('the prebuild plugin registers the same URL scheme the runtime looks for', () => {
  for (const clientId of [ids.iosClientId, '1234567890-abc_DEF.apps.googleusercontent.com']) {
    expect(pluginUrlScheme(clientId)).toBe(googleUrlScheme(clientId));
  }
  expect(() => pluginUrlScheme('com.googleusercontent.apps.123-ios')).toThrow();
  expect(
    readGoogleClientIds('com.googleusercontent.apps.123-ios', ids.webClientId, schemes),
  ).toBeNull();
});

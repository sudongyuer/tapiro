import { createHash } from 'node:crypto';
import { describe, expect, test } from 'bun:test';

import {
  type AppleCredential,
  type AppleSignIn,
  createAppleIdTokenProvider,
  joinName,
} from './appleIdToken';
import { createNonceSource } from './nonce';

const sha256 = async (value: string) => createHash('sha256').update(value).digest('hex');
const nonces = createNonceSource(() => 'raw-nonce', sha256);

const credential = (overrides: Partial<AppleCredential> = {}): AppleCredential => ({
  user: 'apple-subject',
  identityToken: 'apple-jwt',
  fullName: null,
  ...overrides,
});

const rejecting =
  (code: string): AppleSignIn =>
  async () => {
    throw Object.assign(new Error(code), { code });
  };

describe('apple ID token provider', () => {
  test('sends Apple the SHA-256 of the nonce and returns the raw nonce for Supabase', async () => {
    let sent = '';
    const provider = createAppleIdTokenProvider(async ({ nonce }) => {
      sent = nonce;
      return credential();
    }, nonces);
    const result = await provider.requestIdToken();
    expect(sent).toBe(createHash('sha256').update('raw-nonce').digest('hex'));
    expect(result).toEqual({
      ok: true,
      idToken: 'apple-jwt',
      nonce: 'raw-nonce',
      fullName: undefined,
      subject: 'apple-subject',
    });
  });

  test('a new nonce is drawn for every attempt', async () => {
    let count = 0;
    const sent: string[] = [];
    const provider = createAppleIdTokenProvider(
      async ({ nonce }) => {
        sent.push(nonce);
        return credential();
      },
      createNonceSource(() => `n${count++}`, sha256),
    );
    await provider.requestIdToken();
    await provider.requestIdToken();
    expect(new Set(sent).size).toBe(2);
  });

  test('cancelling the system sheet is cancelled, not failed', async () => {
    const provider = createAppleIdTokenProvider(rejecting('ERR_REQUEST_CANCELED'), nonces);
    expect(await provider.requestIdToken()).toEqual({ ok: false, reason: 'cancelled' });
  });

  test('other native errors and a missing identity token fail', async () => {
    for (const signIn of [
      rejecting('ERR_REQUEST_UNKNOWN'),
      rejecting('ERR_REQUEST_FAILED'),
      async () => credential({ identityToken: null }),
    ]) {
      const provider = createAppleIdTokenProvider(signIn, nonces);
      expect(await provider.requestIdToken()).toEqual({ ok: false, reason: 'failed' });
    }
  });

  test('a nonce that cannot be made fails without opening the sheet', async () => {
    let opened = false;
    const provider = createAppleIdTokenProvider(
      async () => {
        opened = true;
        return credential();
      },
      async () => {
        throw new Error('no randomness');
      },
    );
    expect(await provider.requestIdToken()).toEqual({ ok: false, reason: 'failed' });
    expect(opened).toBe(false);
  });

  test('the first-sign-in name is passed on', async () => {
    const provider = createAppleIdTokenProvider(
      async () => credential({ fullName: { givenName: 'Mei Ling', familyName: 'Tan' } }),
      nonces,
    );
    expect(await provider.requestIdToken()).toMatchObject({ ok: true, fullName: 'Mei Ling Tan' });
  });
});

describe('apple name', () => {
  test('Chinese names keep family-name-first order without a space', () => {
    expect(joinName({ givenName: '小貘', familyName: '林' })).toBe('林小貘');
  });

  test('Korean and Japanese names are family-first too', () => {
    expect(joinName({ givenName: '민수', familyName: '김' })).toBe('김민수');
    expect(joinName({ givenName: 'さくら', familyName: '山田' })).toBe('山田さくら');
  });

  test('mixed scripts keep the given-first order with a space', () => {
    expect(joinName({ givenName: 'Xiao Mao', familyName: '林' })).toBe('Xiao Mao 林');
    expect(joinName({ givenName: '小貘', familyName: 'Tan' })).toBe('小貘 Tan');
  });

  test('Latin names are given, middle, family', () => {
    expect(joinName({ givenName: 'Muhammad', middleName: 'Hafiz', familyName: 'Ali' })).toBe(
      'Muhammad Hafiz Ali',
    );
  });

  test('blank or missing parts give no name', () => {
    expect(joinName(null)).toBeUndefined();
    expect(joinName({ givenName: ' ', familyName: null })).toBeUndefined();
    expect(joinName({ givenName: 'Jo' })).toBe('Jo');
  });
});

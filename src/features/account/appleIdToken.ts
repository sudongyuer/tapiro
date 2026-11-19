import { errorCode } from './errorCode';
import type { NonceSource } from './nonce';
import type { IdTokenProvider } from './types';

export type AppleCredential = {
  identityToken: string | null;
  fullName: {
    givenName?: string | null;
    middleName?: string | null;
    familyName?: string | null;
  } | null;
};

export type AppleSignIn = (options: { nonce: string }) => Promise<AppleCredential>;

export const APPLE_CANCELLED_CODE = 'ERR_REQUEST_CANCELED';

export function createAppleIdTokenProvider(
  signIn: AppleSignIn,
  nonces: NonceSource,
): IdTokenProvider {
  return {
    async requestIdToken() {
      try {
        const nonce = await nonces();
        const credential = await signIn({ nonce: nonce.hashed });
        if (!credential.identityToken) return { ok: false, reason: 'failed' };
        return {
          ok: true,
          idToken: credential.identityToken,
          nonce: nonce.raw,
          fullName: joinName(credential.fullName),
        };
      } catch (error) {
        return {
          ok: false,
          reason: errorCode(error) === APPLE_CANCELLED_CODE ? 'cancelled' : 'failed',
        };
      }
    },
  };
}

const EAST_ASIAN = /^[\p{Script=Han}\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}\s]+$/u;

export function joinName(name: AppleCredential['fullName']): string | undefined {
  const given = [name?.givenName, name?.middleName].map((part) => part?.trim()).filter(Boolean);
  const family = name?.familyName?.trim();
  if (family && given.length > 0 && EAST_ASIAN.test(family + given.join(''))) {
    return family + given.join('');
  }
  const joined = [...given, family].filter(Boolean).join(' ');
  return joined || undefined;
}

import { errorCode } from './errorCode';
import type { IdTokenProvider } from './types';

export type GoogleClientIds = { iosClientId: string; webClientId: string };

export type GoogleSignInResponse =
  { type: 'success'; data: { idToken: string | null } } | { type: 'cancelled'; data: null };

export type GoogleSignInModule = {
  configure(options: GoogleClientIds): void;
  signIn(): Promise<GoogleSignInResponse>;
  signOut(): Promise<unknown>;
  cancelledCode: string;
};

const PUBLIC_CLIENT_ID = /^[\w-]+\.apps\.googleusercontent\.com$/;

export function readGoogleClientIds(
  iosClientId: string | undefined,
  webClientId: string | undefined,
): GoogleClientIds | null {
  const ios = iosClientId?.trim();
  const web = webClientId?.trim();
  if (!ios || !web || !PUBLIC_CLIENT_ID.test(ios) || !PUBLIC_CLIENT_ID.test(web)) return null;
  return { iosClientId: ios, webClientId: web };
}

// The GoogleSignIn SDK on iOS adds a nonce the app cannot read, so the backend skips the Google nonce check
// (supabase/config.toml `skip_nonce_check`).
export function createGoogleIdTokenProvider(
  google: GoogleSignInModule,
  clientIds: GoogleClientIds,
): IdTokenProvider {
  let configured = false;
  return {
    async requestIdToken() {
      try {
        if (!configured) {
          google.configure(clientIds);
          configured = true;
        }
        const response = await google.signIn();
        if (response.type === 'cancelled') return { ok: false, reason: 'cancelled' };
        if (!response.data.idToken) return { ok: false, reason: 'failed' };
        return { ok: true, idToken: response.data.idToken };
      } catch (error) {
        return {
          ok: false,
          reason: errorCode(error) === google.cancelledCode ? 'cancelled' : 'failed',
        };
      }
    },
    async forget() {
      await google.signOut().catch(() => {});
    },
  };
}

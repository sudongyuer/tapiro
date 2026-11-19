import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { AppleAuthenticationScope, signInAsync } from 'expo-apple-authentication';
import { CryptoDigestAlgorithm, digestStringAsync, randomUUID } from 'expo-crypto';
import { registeredUrlSchemes } from 'tapiro-kit';

import { createAppleIdTokenProvider } from './appleIdToken';
import { createGoogleIdTokenProvider, readGoogleClientIds } from './googleIdToken';
import { createNonceSource } from './nonce';
import type { ProviderAdapters } from './types';

export function createProviderAdapters(): ProviderAdapters {
  const nonces = createNonceSource(randomUUID, (value) =>
    digestStringAsync(CryptoDigestAlgorithm.SHA256, value),
  );
  const apple = createAppleIdTokenProvider(
    ({ nonce }) =>
      signInAsync({
        nonce,
        requestedScopes: [AppleAuthenticationScope.FULL_NAME, AppleAuthenticationScope.EMAIL],
      }),
    nonces,
  );
  const googleClientIds = readGoogleClientIds(
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    registeredUrlSchemes(),
  );
  if (!googleClientIds) {
    if (__DEV__ && process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID) {
      console.warn(
        'Google sign-in is off: the client IDs are invalid or the reversed iOS client ID is not a registered URL scheme. Run prebuild again after setting EXPO_PUBLIC_GOOGLE_*.',
      );
    }
    return { apple };
  }
  const google = createGoogleIdTokenProvider(
    {
      configure: GoogleSignin.configure,
      signIn: GoogleSignin.signIn,
      signInSilently: GoogleSignin.signInSilently,
      signOut: GoogleSignin.signOut,
      revokeAccess: GoogleSignin.revokeAccess,
    },
    googleClientIds,
  );
  return { apple, google };
}

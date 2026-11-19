import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { AppleAuthenticationScope, signInAsync } from 'expo-apple-authentication';
import { CryptoDigestAlgorithm, digestStringAsync, randomUUID } from 'expo-crypto';

import { createAppleIdTokenProvider } from './appleIdToken';
import { createGoogleIdTokenProvider, readGoogleClientIds } from './googleIdToken';
import { createNonceSource } from './nonce';
import type { ProviderAdapters } from './types';

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
);

export const providerAdapters: ProviderAdapters = {
  apple,
  ...(googleClientIds && {
    google: createGoogleIdTokenProvider(
      {
        configure: GoogleSignin.configure,
        signIn: GoogleSignin.signIn,
        signOut: GoogleSignin.signOut,
        cancelledCode: statusCodes.SIGN_IN_CANCELLED,
      },
      googleClientIds,
    ),
  }),
};

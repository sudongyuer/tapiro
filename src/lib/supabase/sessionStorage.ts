import * as SecureStore from 'expo-secure-store';

import { createChunkedStorage } from './chunkedStorage';

const options: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

// Keychain items over ~2 KB can be rejected, and a Supabase session with provider metadata exceeds that.
export const sessionStorage = createChunkedStorage({
  getItemAsync: (key) => SecureStore.getItemAsync(key, options),
  setItemAsync: (key, value) => SecureStore.setItemAsync(key, value, options),
  deleteItemAsync: (key) => SecureStore.deleteItemAsync(key, options),
});

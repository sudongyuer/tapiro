import { addNetworkStateListener, getNetworkStateAsync } from 'expo-network';
import { useSyncExternalStore } from 'react';

import { uiVerify, uiVerifyArgument } from '@/lib/uiVerify';

import { createNetworkStore, type NetworkSource } from './networkStore';

const deviceSource: NetworkSource = {
  read: getNetworkStateAsync,
  listen(on) {
    const subscription = addNetworkStateListener(on);
    return () => subscription.remove();
  },
};

function fixedSource(isConnected: boolean): NetworkSource {
  return { read: async () => ({ isConnected }), listen: () => () => undefined };
}

const store = createNetworkStore(
  uiVerify ? fixedSource(uiVerifyArgument('uiVerifyOffline') !== '1') : deviceSource,
);

export function useOffline() {
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

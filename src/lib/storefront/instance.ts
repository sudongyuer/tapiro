import { useEffect, useSyncExternalStore } from 'react';
import { AppState, Settings } from 'react-native';
import { Storefront } from 'tapiro-kit';

import { onReturnToForeground } from '../foreground';
import { uiVerify, uiVerifyArgument } from '../uiVerify';
import { createStorefront, type StorefrontSource } from './controller';
import { CHINA_MAINLAND, aiOffered, storefrontCode, storefrontHeader } from './region';

const CACHE_KEY = 'storefrontCountry';
const TIMEOUT_MS = 5_000;
const VERIFY_DEFAULT = 'MYS';

function verifySource(): StorefrontSource {
  const argument = uiVerifyArgument('uiVerifyStorefront') ?? VERIFY_DEFAULT;
  const code = argument === 'none' ? null : storefrontCode(argument);
  return {
    countryCode: () => Promise.resolve(code),
    listen: () => ({ remove() {} }),
  };
}

const verifyCache = { read: () => null, write() {} };

const deviceCache = {
  read: () => Settings.get(CACHE_KEY),
  write: (countryCode: string) => Settings.set({ [CACHE_KEY]: countryCode }),
};

export const storefront = createStorefront({
  source: uiVerify ? verifySource() : Storefront,
  cache: uiVerify ? verifyCache : deviceCache,
  timeoutMs: TIMEOUT_MS,
});

export const currentStorefrontHeader = () => storefrontHeader(storefront.get());

export const aiOfferedNow = () => aiOffered(storefront.get());

export function useAiOffered() {
  return useSyncExternalStore(storefront.subscribe, aiOfferedNow);
}

const onChinaStorefront = () => storefront.get().countryCode === CHINA_MAINLAND;

export function useChinaStorefront() {
  return useSyncExternalStore(storefront.subscribe, onChinaStorefront);
}

export function useStorefrontFollow() {
  useEffect(() => {
    const stop = storefront.follow();
    const offForeground = onReturnToForeground(AppState, () => void storefront.refresh());
    return () => {
      stop();
      offForeground();
    };
  }, []);
}

import { Settings } from 'react-native';

import { fixtureVariant } from './fixtureVariant';

export const uiVerify = process.env.EXPO_PUBLIC_UI_VERIFY === '1';

export const debugToolsEnabled = __DEV__ || uiVerify;

// Launch arguments (`-uiVerifyScene <id>`) land in NSUserDefaults; a deep link would trigger the system "Open in" prompt.
export function uiVerifyArgument(name: string): string | undefined {
  return uiVerify ? Settings.get(name) : undefined;
}

export const uiVerifyScene = uiVerifyArgument('uiVerifyScene');

export const uiVerifyFixture = fixtureVariant(uiVerifyArgument('uiVerifyFixture'));

import { Settings } from 'react-native';

export const uiVerify = process.env.EXPO_PUBLIC_UI_VERIFY === '1';

export const debugToolsEnabled = __DEV__ || uiVerify;

// Launch arguments (`-uiVerifyScene <id>`) land in NSUserDefaults; a deep link would trigger the system "Open in" prompt.
export const uiVerifyScene: string | undefined = uiVerify
  ? Settings.get('uiVerifyScene')
  : undefined;

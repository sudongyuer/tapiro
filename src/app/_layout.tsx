import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { useAccountStage } from '@/features/account';
import { applySheetGone } from '@/features/bounty';
import { I18nProvider } from '@/lib/i18n';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <I18nProvider>
        <RootStack />
      </I18nProvider>
    </ThemeProvider>
  );
}

const PAGE_SHEET = { presentation: 'pageSheet', headerShown: true } as const;

// A sheet closed from JS is unmounted before its own transitionEnd; the stack reports when the dismissal finished.
const FINISHED = { onFinishTransitioning: applySheetGone };

function RootStack() {
  const stage = useAccountStage();
  return (
    <Stack
      screenOptions={{ headerShown: false, headerTransparent: true }}
      unstable_nativeProps={FINISHED}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="legal/terms" options={PAGE_SHEET} />
      <Stack.Screen name="legal/privacy" options={PAGE_SHEET} />
      <Stack.Protected guard={stage === 'signedOut'}>
        <Stack.Screen name="welcome" />
      </Stack.Protected>
      <Stack.Protected guard={stage === 'onboarding'}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={stage === 'ready'}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="ask"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.5, 1],
            sheetGrabberVisible: true,
          }}
        />
        <Stack.Screen name="payee/phone" options={PAGE_SHEET} />
        <Stack.Screen name="payee/bank" options={PAGE_SHEET} />
        <Stack.Screen name="payee/qr" options={PAGE_SHEET} />
        <Stack.Screen name="pay/[id]" options={PAGE_SHEET} />
        <Stack.Screen name="bounty-apply/[id]" options={PAGE_SHEET} />
        <Stack.Screen
          name="bounty-map"
          options={{ presentation: 'fullScreenModal', headerShown: true, title: '' }}
        />
        <Stack.Screen
          name="bounty-post"
          options={{ presentation: 'pageSheet', headerShown: false }}
        />
        <Stack.Screen
          name="delete-account"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: 'fitToContents',
            sheetGrabberVisible: true,
          }}
        />
      </Stack.Protected>
    </Stack>
  );
}

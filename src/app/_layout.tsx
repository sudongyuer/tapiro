import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { useAccountStage } from '@/features/account';
import { applySheetGone } from '@/features/bounty';
import { BUY_COINS_SHEET_OPTIONS } from '@/features/coins';
import { REVIEW_SHEET_OPTIONS, TIER_DROP_SHEET_OPTIONS } from '@/features/reputation';
import { useRideReminders } from '@/features/ride';
import { I18nProvider } from '@/lib/i18n';
import { useDiscardNoticeTaps } from '@/lib/notifications';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <KeyboardProvider>
        <I18nProvider>
          <RootStack />
        </I18nProvider>
      </KeyboardProvider>
    </ThemeProvider>
  );
}

const PAGE_SHEET = { presentation: 'pageSheet', headerShown: true } as const;

// A sheet closed from JS is unmounted before its own transitionEnd; the stack reports when the dismissal finished.
const FINISHED = { onFinishTransitioning: applySheetGone };

function RootStack() {
  const stage = useAccountStage();
  useRideReminders(stage);
  useDiscardNoticeTaps(stage === 'signedOut');
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
        <Stack.Screen name="ask-consent" options={{ presentation: 'pageSheet' }} />
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
          name="ride-create"
          options={{ presentation: 'pageSheet', headerShown: false }}
        />
        <Stack.Screen name="tier-drop" options={TIER_DROP_SHEET_OPTIONS} />
        <Stack.Screen name="review" options={REVIEW_SHEET_OPTIONS} />
        <Stack.Screen name="buy-coins" options={BUY_COINS_SHEET_OPTIONS} />
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

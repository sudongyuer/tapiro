import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { useAccountStage } from '@/features/account';
import { I18nProvider, useI18n } from '@/lib/i18n';

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

function RootStack() {
  const { t } = useI18n();
  const stage = useAccountStage();
  return (
    <Stack screenOptions={{ headerShown: false, headerTransparent: true }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={stage === 'signedOut'}>
        <Stack.Screen name="welcome" />
      </Stack.Protected>
      <Stack.Protected guard={stage === 'onboarding'}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={stage === 'ready'}>
        <Stack.Screen
          name="home"
          options={{
            headerShown: true,
            headerLargeTitleEnabled: true,
            title: t('account.home.title'),
          }}
        />
        <Stack.Screen
          name="settings"
          options={{ headerShown: true, title: t('account.settings.title') }}
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

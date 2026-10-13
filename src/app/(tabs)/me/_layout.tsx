import { Stack } from 'expo-router';

import { useI18n } from '@/lib/i18n';

export default function MeLayout() {
  const { t } = useI18n();
  return (
    <Stack screenOptions={{ headerTransparent: true }}>
      <Stack.Screen
        name="index"
        options={{ title: t('shell.tabs.me'), headerLargeTitleEnabled: true }}
      />
      <Stack.Screen name="settings" options={{ title: t('account.settings.title') }} />
    </Stack>
  );
}

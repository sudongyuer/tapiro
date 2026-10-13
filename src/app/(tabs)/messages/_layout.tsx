import { Stack } from 'expo-router';

import { useI18n } from '@/lib/i18n';

export default function MessagesLayout() {
  const { t } = useI18n();
  return (
    <Stack screenOptions={{ headerTransparent: true, headerLargeTitleEnabled: true }}>
      <Stack.Screen name="index" options={{ title: t('shell.tabs.messages') }} />
    </Stack>
  );
}

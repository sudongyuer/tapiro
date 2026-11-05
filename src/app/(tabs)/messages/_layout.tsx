import { Stack } from 'expo-router';

import { useI18n } from '@/lib/i18n';

export const unstable_settings = { anchor: 'index' };

export default function MessagesLayout() {
  const { t } = useI18n();
  return (
    <Stack screenOptions={{ headerTransparent: true, headerLargeTitleEnabled: true }}>
      <Stack.Screen name="index" options={{ title: t('shell.tabs.messages') }} />
      <Stack.Screen
        name="[thread]"
        options={{ headerLargeTitleEnabled: false, scrollEdgeEffects: { top: 'automatic' } }}
      />
    </Stack>
  );
}

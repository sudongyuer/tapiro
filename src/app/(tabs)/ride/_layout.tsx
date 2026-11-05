import { Stack } from 'expo-router';

import { useI18n } from '@/lib/i18n';

export const unstable_settings = { anchor: 'index' };

export default function RideLayout() {
  const { t } = useI18n();
  return (
    <Stack screenOptions={{ headerTransparent: true, headerLargeTitleEnabled: true }}>
      <Stack.Screen name="index" options={{ title: t('shell.tabs.ride') }} />
      <Stack.Screen
        name="[id]"
        options={{
          title: t('ride.detail.title'),
          headerLargeTitleEnabled: false,
          scrollEdgeEffects: { top: 'automatic' },
        }}
      />
      <Stack.Screen
        name="history"
        options={{
          title: t('ride.history.title'),
          headerLargeTitleEnabled: false,
          scrollEdgeEffects: { top: 'automatic' },
        }}
      />
    </Stack>
  );
}

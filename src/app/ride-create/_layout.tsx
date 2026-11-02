import { Stack, useNavigation } from 'expo-router';
import { useEffect } from 'react';

import { registerRideSheet } from '@/features/ride';
import { useI18n } from '@/lib/i18n';

export const unstable_settings = { anchor: 'index' };

export default function RideCreateLayout() {
  const { t } = useI18n();
  const navigation = useNavigation();
  useEffect(() => registerRideSheet(() => navigation.goBack()), [navigation]);
  return (
    <Stack screenOptions={{ headerTransparent: true }}>
      <Stack.Screen
        name="index"
        options={{
          title: t('ride.create.pick.heading'),
          headerLargeTitle: true,
          headerBackTitle: t('ride.create.pick.heading'),
        }}
      />
      <Stack.Screen
        name="form"
        options={{ title: t('ride.create.title'), headerBackTitle: t('ride.create.title') }}
      />
      <Stack.Screen name="confirm" options={{ title: t('ride.create.confirm.title') }} />
      <Stack.Screen name="place" options={{ title: t('ride.create.form.start') }} />
    </Stack>
  );
}

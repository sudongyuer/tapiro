import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { PlaceSearchScreen } from '@/features/place';
import { useI18n } from '@/lib/i18n';

export default function RideCreatePlaceRoute() {
  const router = useRouter();
  const { t } = useI18n();
  const { which } = useLocalSearchParams<{ which?: string }>();
  const dest = which === 'dest';
  return (
    <>
      <Stack.Screen
        options={{ title: dest ? t('ride.create.form.dest') : t('ride.create.form.start') }}
      />
      <PlaceSearchScreen purpose={dest ? 'rideDest' : 'rideStart'} onPicked={() => router.back()} />
    </>
  );
}

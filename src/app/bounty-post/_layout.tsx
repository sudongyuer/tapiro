import { Stack, useNavigation } from 'expo-router';
import { useEffect } from 'react';

import { registerPostSheet } from '@/features/bounty';
import { useI18n } from '@/lib/i18n';

export default function BountyPostLayout() {
  const { t } = useI18n();
  const navigation = useNavigation();
  useEffect(() => registerPostSheet(() => navigation.goBack()), [navigation]);
  return (
    <Stack screenOptions={{ headerTransparent: true }}>
      <Stack.Screen name="index" options={{ title: t('bounty.post.title') }} />
      <Stack.Screen name="confirm" options={{ title: t('bounty.post.confirm.title') }} />
      <Stack.Screen name="place" options={{ title: t('bounty.place.title') }} />
    </Stack>
  );
}

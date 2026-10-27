import { Stack } from 'expo-router';

import { useI18n } from '@/lib/i18n';

export default function BountyPostLayout() {
  const { t } = useI18n();
  return (
    <Stack screenOptions={{ headerTransparent: true }}>
      <Stack.Screen name="index" options={{ title: t('bounty.post.title') }} />
      <Stack.Screen name="confirm" options={{ title: t('bounty.post.confirm.title') }} />
    </Stack>
  );
}

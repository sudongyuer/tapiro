import { Stack } from 'expo-router';

import { useI18n } from '@/lib/i18n';

export default function OnboardingLayout() {
  const { t } = useI18n();
  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerTitle: '',
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ title: t('account.name.title') }} />
      <Stack.Screen name="language" options={{ title: t('account.language.title') }} />
    </Stack>
  );
}

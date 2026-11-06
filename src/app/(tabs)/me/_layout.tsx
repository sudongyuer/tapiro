import { Stack } from 'expo-router';

import {
  PROFILE_LIST_OPTIONS,
  PROFILE_SCREEN_OPTIONS,
  PROFILE_SHEET_OPTIONS,
} from '@/features/reputation';
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
      <Stack.Screen
        name="stickers"
        options={{ title: t('stickers.book.title'), headerTitle: '' }}
      />
      <Stack.Screen name="payee" options={{ title: t('payee.title') }} />
      <Stack.Screen name="blocked" options={{ title: t('block.list.title') }} />
      <Stack.Screen name="profile/[id]" options={PROFILE_SCREEN_OPTIONS} />
      <Stack.Screen name="profile/reviews/[id]" options={PROFILE_LIST_OPTIONS} />
      <Stack.Screen name="profile/report" options={PROFILE_SHEET_OPTIONS} />
      <Stack.Screen name="profile/reply" options={PROFILE_SHEET_OPTIONS} />
    </Stack>
  );
}

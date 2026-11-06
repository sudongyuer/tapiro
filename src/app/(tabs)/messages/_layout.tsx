import { Stack } from 'expo-router';

import {
  PROFILE_LIST_OPTIONS,
  PROFILE_SCREEN_OPTIONS,
  PROFILE_SHEET_OPTIONS,
} from '@/features/reputation';
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
      <Stack.Screen
        name="report"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.7, 1],
          sheetGrabberVisible: true,
          headerLargeTitleEnabled: false,
        }}
      />
      <Stack.Screen name="profile/[id]" options={PROFILE_SCREEN_OPTIONS} />
      <Stack.Screen name="profile/reviews/[id]" options={PROFILE_LIST_OPTIONS} />
      <Stack.Screen name="profile/report" options={PROFILE_SHEET_OPTIONS} />
      <Stack.Screen name="profile/reply" options={PROFILE_SHEET_OPTIONS} />
    </Stack>
  );
}

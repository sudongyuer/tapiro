import { Stack } from 'expo-router';

import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/ui/theme/useTheme';

// The anchor for pushes from outside the tab (`withAnchor`): the board sits under the pushed screen, so back works.
export const unstable_settings = { initialRouteName: 'index' };

export default function BountyLayout() {
  const { t } = useI18n();
  const { color } = useTheme();
  const onStage = color('--color-on-stage');
  return (
    <Stack screenOptions={{ headerTransparent: true, headerLargeTitleEnabled: true }}>
      <Stack.Screen
        name="index"
        options={{
          title: t('shell.home.title'),
          headerTitleStyle: { color: onStage },
          headerLargeTitleStyle: { color: onStage, fontWeight: '800' },
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: t('bounty.detail.title'),
          headerTitle: '',
          headerLargeTitleEnabled: false,
        }}
      />
      <Stack.Screen
        name="applicants/[id]"
        options={{
          headerTitle: '',
          headerBackTitle: t('shell.home.title'),
          headerLargeTitleEnabled: false,
          scrollEdgeEffects: { top: 'automatic' },
        }}
      />
      <Stack.Screen
        name="status/[id]"
        options={{
          headerTitle: '',
          headerBackTitle: t('shell.home.title'),
          headerLargeTitleEnabled: false,
          scrollEdgeEffects: { top: 'automatic' },
        }}
      />
      <Stack.Screen
        name="place"
        options={{ title: t('bounty.board.place.pick'), headerLargeTitleEnabled: false }}
      />
    </Stack>
  );
}

import { Stack } from 'expo-router';

import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/ui/theme/useTheme';

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
        name="place"
        options={{ title: t('bounty.board.place.pick'), headerLargeTitleEnabled: false }}
      />
    </Stack>
  );
}

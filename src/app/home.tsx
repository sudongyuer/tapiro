import { Stack, useRouter } from 'expo-router';
import { PlatformColor, ScrollView, StyleSheet } from 'react-native';

import { AccountGreeting, useProfile, useSignedInUser } from '@/features/account';
import { useI18n } from '@/lib/i18n';
import { vars } from '@/ui/theme/tokens';

export default function Home() {
  const { t } = useI18n();
  const router = useRouter();
  const user = useSignedInUser();
  const profile = useProfile(user);
  const ready = profile.status === 'ready' ? profile.profile : null;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="gearshape"
          accessibilityLabel={t('account.home.settings')}
          onPress={() => router.push('/settings')}
        />
      </Stack.Toolbar>
      <AccountGreeting
        name={ready?.displayName ?? user?.name ?? ''}
        avatarUrl={ready?.avatarUrl ?? user?.avatarUrl ?? null}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PlatformColor('systemGroupedBackground') },
  content: { padding: vars['--space-4'] },
});

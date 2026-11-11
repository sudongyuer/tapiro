import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Store } from 'tapiro-kit';

import { TEST_ACCOUNT_PASSWORD, TEST_ACCOUNTS } from '@/features/account/testAccounts';
import { useI18n } from '@/lib/i18n';
import { getSupabase } from '@/lib/supabase';
import { AppText } from '@/ui/AppText';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';

export function StoreE2EScene({ onReady }: { onReady: () => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [line, setLine] = useState('');

  useEffect(() => {
    void getSupabase()
      ?.auth.getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null));
    onReady();
  }, [onReady]);

  const signIn = async () => {
    const client = getSupabase();
    if (!client) return setLine('no supabase client');
    const { data, error } = await client.auth.signInWithPassword({
      email: TEST_ACCOUNTS[0].email,
      password: TEST_ACCOUNT_PASSWORD,
    });
    if (error) return setLine(`sign in failed ${error.message}`);
    setUserId(data.user.id);
  };

  const buyKept = async () => {
    if (!userId) return setLine('sign in first');
    const result = await Store.purchase('app.tapiro.coins.5', userId);
    setLine(`purchase app.tapiro.coins.5 ${result.status}`);
  };

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <AppText variant="meta" testID="store-e2e-user">
        {userId ? `signed in ${userId}` : '-'}
      </AppText>
      <View style={styles.buttons}>
        <PillButton label={t('debug.store.signIn')} onPress={signIn} variant="secondary" />
        <PillButton
          label={t('debug.store.openCoins')}
          onPress={() => router.push('/me/coins')}
          testID="store-e2e-open-coins"
        />
        <PillButton label={t('debug.store.buyKept')} onPress={buyKept} variant="secondary" />
      </View>
      <AppText variant="meta" selectable testID="store-e2e-line">
        {line}
      </AppText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: vars['--space-4'], gap: vars['--space-2'] },
  buttons: { gap: vars['--space-2'] },
});

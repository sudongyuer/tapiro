import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Store } from 'tapiro-kit';

import { accountActions } from '@/features/account';
import { TEST_ACCOUNT_PASSWORD, TEST_ACCOUNTS } from '@/features/account/testAccounts';
import { useI18n } from '@/lib/i18n';
import { getSupabase } from '@/lib/supabase';
import { AppText } from '@/ui/AppText';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';

// Onboarding state is kept on the device, so a fresh Simulator would route the seeded account into onboarding and
// never open the tabs; the harness tests StoreKit, not onboarding.
const KEPT_CHECK_MS = 5_000;

function signedIn(userId: string) {
  accountActions.finishOnboarding(userId);
  return userId;
}

export function StoreE2EScene({ onReady }: { onReady: () => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [line, setLine] = useState('');

  useEffect(() => {
    void getSupabase()
      ?.auth.getUser()
      .then(({ data }) => setUserId(data.user ? signedIn(data.user.id) : null));
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
    setUserId(signedIn(data.user.id));
  };

  // Signed out, no purchase listener runs, so the transaction stays unfinished until the next session sweeps it.
  const buyKept = async () => {
    if (!userId) return setLine('sign in first');
    await accountActions.signOut();
    setUserId(null);
    const result = await Store.purchase('app.tapiro.coins.5', userId);
    if (result.status !== 'purchased')
      return setLine(`purchase app.tapiro.coins.5 ${result.status}`);
    await new Promise((resolve) => setTimeout(resolve, KEPT_CHECK_MS));
    const unfinished = await Store.unfinished();
    const kept = unfinished.some((t) => t.transactionId === result.transaction.transactionId);
    setLine(`purchase app.tapiro.coins.5 purchased, ${kept ? 'kept unfinished' : 'finished'}`);
  };

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <AppText variant="meta" testID="store-e2e-user">
        {userId === undefined ? 'checking' : userId ? `signed in ${userId}` : '-'}
      </AppText>
      <View style={styles.buttons}>
        <PillButton
          label={t('debug.store.signIn')}
          onPress={signIn}
          variant="secondary"
          testID="store-e2e-sign-in"
        />
        <PillButton
          label={t('debug.store.openCoins')}
          onPress={() => router.push('/me/coins')}
          testID="store-e2e-open-coins"
        />
        <PillButton
          label={t('debug.store.buyKept')}
          onPress={buyKept}
          variant="secondary"
          testID="store-e2e-buy-kept"
        />
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

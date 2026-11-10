import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Store, type StoreTransaction } from 'tapiro-kit';

import { TEST_ACCOUNT_PASSWORD, TEST_ACCOUNTS } from '@/features/account/testAccounts';
import { createVerifyClient, forwardTransaction } from '@/features/coins/purchase';
import { useI18n } from '@/lib/i18n';
import { getSupabase } from '@/lib/supabase';
import { AppText } from '@/ui/AppText';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';

const PRODUCT_IDS = ['app.tapiro.coins.5', 'app.tapiro.coins.11', 'app.tapiro.coins.35'];

export function StoreSpikeScene({ onReady }: { onReady: () => void }) {
  const { t } = useI18n();
  const [lines, setLines] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const forwarding = useRef(new Set<string>());

  const log = useCallback((line: string) => {
    console.log(`[store-spike] ${line}`);
    setLines((prev) => [line, ...prev].slice(0, 40));
  }, []);

  const forward = useCallback(
    async (transaction: StoreTransaction) => {
      const client = getSupabase();
      if (!client || forwarding.current.has(transaction.transactionId)) return;
      forwarding.current.add(transaction.transactionId);
      try {
        log(
          `tx ${transaction.source} ${transaction.transactionId} ${transaction.productId} env=${transaction.environment} revoked=${transaction.revoked} verified=${transaction.verified}`,
        );
        const outcome = await forwardTransaction(
          transaction,
          createVerifyClient(client),
          Store.finish,
        );
        log(
          `forward ${transaction.productId} ${transaction.transactionId} ${JSON.stringify(outcome)}`,
        );
      } finally {
        forwarding.current.delete(transaction.transactionId);
      }
    },
    [log],
  );

  useEffect(() => {
    const subscription = Store.listen((transaction) => void forward(transaction));
    void getSupabase()
      ?.auth.getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null));
    onReady();
    return () => subscription.remove();
  }, [forward, onReady]);

  const signIn = async () => {
    const client = getSupabase();
    if (!client) return log('no supabase client');
    const { data, error } = await client.auth.signInWithPassword({
      email: TEST_ACCOUNTS[0].email,
      password: TEST_ACCOUNT_PASSWORD,
    });
    if (error) return log(`signIn failed ${error.message}`);
    setUserId(data.user.id);
    log(`signed in ${data.user.id}`);
  };

  const products = async () => log(`products ${JSON.stringify(await Store.products(PRODUCT_IDS))}`);

  const buy = async (productId: string, forwardIt = true) => {
    if (!userId) return log('sign in first');
    const result = await Store.purchase(productId, userId);
    log(`purchase ${productId} ${result.status}${'code' in result ? ` ${result.code}` : ''}`);
    if (result.status === 'purchased' && forwardIt) {
      log(`jws header ${jwsHeaderSummary(result.transaction.jws)}`);
      await forward(result.transaction);
    }
  };

  const unfinished = async () => {
    const list = await Store.unfinished();
    log(`unfinished ${list.length}`);
    for (const transaction of list) await forward(transaction);
  };

  const revoked = async () => {
    const list = await Store.revoked();
    log(`revoked ${list.length}`);
    for (const transaction of list) await forward(transaction);
  };

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <AppText variant="meta" testID="store-spike-user">
        {userId ?? '-'}
      </AppText>
      <View style={styles.buttons}>
        <PillButton label={t('debug.store.signIn')} onPress={signIn} variant="secondary" />
        <PillButton label={t('debug.store.products')} onPress={products} variant="secondary" />
        {PRODUCT_IDS.map((id) => (
          <PillButton
            key={id}
            label={t('debug.store.buy', { id: id.split('.').pop() })}
            onPress={() => buy(id)}
            testID={`store-spike-buy-${id.split('.').pop()}`}
          />
        ))}
        <PillButton
          label={t('debug.store.buyKept')}
          onPress={() => buy(PRODUCT_IDS[0], false)}
          variant="secondary"
        />
        <PillButton label={t('debug.store.unfinished')} onPress={unfinished} variant="secondary" />
        <PillButton label={t('debug.store.revoked')} onPress={revoked} variant="secondary" />
      </View>
      {lines.map((line, index) => (
        <AppText key={`${index}-${line}`} variant="meta" selectable>
          {line}
        </AppText>
      ))}
    </ScrollView>
  );
}

function jwsHeaderSummary(jws: string) {
  try {
    const header = JSON.parse(atob(padBase64(jws.split('.')[0]))) as {
      alg?: string;
      x5c?: string[];
    };
    return `alg=${header.alg} x5c=${header.x5c?.length ?? 0}`;
  } catch {
    return 'unreadable';
  }
}

function padBase64(part: string) {
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
  return base64 + '='.repeat((4 - (base64.length % 4)) % 4);
}

const styles = StyleSheet.create({
  content: { padding: vars['--space-4'], gap: vars['--space-2'] },
  buttons: { gap: vars['--space-2'] },
});
